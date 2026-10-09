import http.server
import datetime as dt
import json
import io
from pathlib import Path
import tempfile
import threading
import types
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch
from bridge import Bridge, Ledger, event_id, make_handler, recognize, select_incoming, message_key, KST


def message(text='14일 수 16-17시 하이라이트 합주임당'):
    return dict(sender='정현우', text=text, sentDate='2026-10-09', sentTime='11:03', self=False, complete=True)


class BridgeTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.ledger = Ledger(Path(self.temp.name) / 'state.json')

    def tearDown(self):
        self.temp.cleanup()

    def test_baseline_dedupe_manual_and_restart(self):
        m = message()
        identity = event_id(m)
        self.ledger.ingest([m], baseline=True)
        self.ledger.ingest([m])
        self.assertEqual(self.ledger.data['events'][identity]['status'], 'baseline')
        self.ledger.ingest([m], manual=True)
        self.ledger.data['events'][identity].update(status='held', note='날짜 확인 필요')
        self.ledger.ingest([m], manual=True)
        self.assertEqual(self.ledger.data['events'][identity]['status'], 'pending')
        plan = {'action': 'cancel', 'target': {'id': 'old-reservation'}}
        self.ledger.prepare(identity, plan)
        restored = Ledger(self.ledger.path)
        self.assertEqual(restored.data['events'][identity]['plan'], plan)
        restored.ingest([m], manual=True)
        self.assertEqual(restored.data['events'][identity]['status'], 'prepared')
        with self.assertRaises(ValueError):
            restored.prepare(identity, {'action': 'cancel', 'target': {'id': 'different'}})
        restored.data['events'][identity]['status'] = 'done'
        restored.ingest([m], manual=True)
        self.assertEqual(len(restored.data['events']), 1)
        self.assertEqual(restored.data['events'][identity]['status'], 'done')

    def test_sender_date_are_part_of_identity(self):
        m = message()
        self.assertNotEqual(event_id(m), event_id({**m, 'sender': '다른사람'}))
        self.assertNotEqual(event_id(m), event_id({**m, 'sentDate': '2026-10-10'}))

    def test_start_again_keeps_new_message_detection(self):
        b = Bridge.__new__(Bridge)
        b.lock, b.ledger = threading.RLock(), self.ledger
        b.ledger.data.update(nickname='김동하', top=78, bottom=150)
        b.control, b.running, b.manual, b.generation = object(), True, False, 1
        b.baseline, b.last_read = False, 'already-read'
        anchor = message('직전 말풍선')
        b.previous_visible = [message_key(anchor)]
        b.start({'nickname': '김동하', 'top': 78, 'bottom': 150})
        incoming, _, _ = select_incoming([anchor, message('금일 기타레슨 취소')], b.previous_visible,
                                        b.baseline, b.manual, '김동하', dt.datetime(2026, 10, 9, 11, 5, tzinfo=KST))
        self.assertEqual([m['text'] for m in incoming], ['금일 기타레슨 취소'])
        self.assertFalse(b.baseline)
        self.assertEqual(b.last_read, 'already-read')
        self.assertEqual(b.generation, 1)
        b.start({'nickname': '김동하', 'top': 78, 'bottom': 150}, manual=True)
        self.assertTrue(b.manual)
        self.assertIsNone(b.last_read)

    def test_skipped_messages_are_visible_in_status(self):
        b = Bridge.__new__(Bridge)
        b.lock, b.ledger, b.token = threading.RLock(), self.ledger, 'test-session'
        b.running, b.note, b.model = True, '읽기 완료', 'test-model'
        self.ledger.ingest([message()], baseline=True)
        with patch('bridge.api_key', return_value='unit-test-key'):
            self.assertEqual(b.status()['events'][0]['status'], 'baseline')

    def test_own_nickname(self):
        self.ledger.data['nickname'] = '내닉네임'
        self.ledger.ingest([{**message(), 'sender': '', 'self': True}])
        self.assertEqual(next(iter(self.ledger.data['events'].values()))['message']['sender'], '내닉네임')

    def test_missing_key_does_not_send(self):
        with patch('bridge.api_key', return_value=''), patch('bridge.urllib.request.urlopen') as request:
            with self.assertRaises(ValueError):
                recognize(b'png')
            request.assert_not_called()

    def test_gemini_request_and_structured_response(self):
        envelope = {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': json.dumps({'messages': [message()]})}]}}]}
        with patch('bridge.api_key', return_value='unit-test-key'), patch('bridge.urllib.request.urlopen', return_value=io.BytesIO(json.dumps(envelope).encode())) as request:
            self.assertEqual(recognize(b'png'), [message()])
            sent_request = request.call_args.args[0]
            self.assertNotIn('unit-test-key', sent_request.full_url)
            self.assertEqual(sent_request.get_header('X-goog-api-key'), 'unit-test-key')
            body = json.loads(sent_request.data)
            self.assertEqual(body['generationConfig']['responseMimeType'], 'application/json')
            self.assertNotIn('maxItems', body['generationConfig']['responseJsonSchema']['properties']['messages'])
            self.assertEqual(body['contents'][0]['parts'][1]['inlineData']['data'], 'cG5n')

    def test_truncated_or_malformed_ocr_is_rejected(self):
        envelopes = [
            {'candidates': [{'finishReason': 'MAX_TOKENS'}]},
            {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': json.dumps({'messages': [message()] * 101})}]}}]},
            {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': json.dumps({'messages': [{**message(), 'sender': None}]})}]}}]},
        ]
        for envelope in envelopes:
            with patch('bridge.api_key', return_value='unit-test-key'), patch('bridge.urllib.request.urlopen', return_value=io.BytesIO(json.dumps(envelope).encode())):
                with self.assertRaises(ValueError):
                    recognize(b'png')

    def test_only_live_new_messages_get_today(self):
        now = dt.datetime(2026, 10, 9, 11, 5, tzinfo=KST)
        anchor = message('앞 메시지')
        new = {**message('금일 하이라이트 합주 없습니다'), 'sentDate': '', 'sentTime': '11:05'}
        incoming, _, _ = select_incoming([anchor, new], [message_key(anchor)], False, False, '김동하', now)
        self.assertEqual(incoming, [new])
        self.assertEqual(new['sentDate'], '2026-10-09')
        self.assertTrue(new['complete'])

    def test_manual_default_date_keeps_different_days_distinct(self):
        ids = []
        for day in [9, 10]:
            m = {**message('금일 20~21시 레슨 하겠습니다'), 'sentDate': ''}
            incoming, _, _ = select_incoming([m], [], False, True, '김동하', dt.datetime(2026, 10, day, 19, 0, tzinfo=KST))
            self.assertEqual(incoming[0]['sentDate'], f'2026-10-{day:02d}')
            ids.append(event_id(incoming[0]))
        self.assertNotEqual(*ids)

    def test_history_and_missing_anchor_never_auto_execute(self):
        now = dt.datetime(2026, 10, 9, 11, 5, tzinfo=KST)
        anchor = message('앞 메시지')
        old = {**message(), 'sentDate': '2026-10-08'}
        incoming, _, _ = select_incoming([anchor, old], [message_key(anchor)], False, False, '', now)
        self.assertFalse(incoming[0]['complete'])
        incoming, _, _ = select_incoming([old], [message_key(anchor)], False, False, '', now)
        self.assertEqual(incoming, [])

    def test_midnight_and_own_message_anchor(self):
        now = dt.datetime(2026, 10, 10, 0, 1, tzinfo=KST)
        anchor = {**message('앞 메시지'), 'sender': '', 'self': True, 'sentTime': '23:59'}
        new = {**message(), 'sender': '', 'self': True, 'sentDate': '', 'sentTime': '00:01'}
        incoming, _, _ = select_incoming([anchor, new], [('김동하', '앞 메시지', '23:59')], False, False, '김동하', now)
        self.assertEqual(incoming[0]['sentDate'], '2026-10-10')
        self.assertEqual(incoming[0]['sender'], '김동하')

    def test_http_boundary(self):
        fake = types.SimpleNamespace(token='local-session', lock=threading.RLock(), ledger=self.ledger, png=b'preview', status=lambda: {'token': 'local-session'})
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), http.server.BaseHTTPRequestHandler)
        port = server.server_port
        server.RequestHandlerClass = make_handler(fake, port)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        origin = f'http://127.0.0.1:{port}'
        def request(path, headers=None, body=None):
            req = urllib.request.Request(origin + path, headers=headers or {}, data=json.dumps(body).encode() if body else None)
            try:
                with urllib.request.urlopen(req) as response:
                    return response.status
            except urllib.error.HTTPError as error:
                return error.code
        try:
            self.assertEqual(request('/api/chat/status'), 200)
            self.assertEqual(request('/api/chat/status', {'Host': 'evil.example'}), 403)
            self.assertEqual(request('/api/chat/status', {'Origin': 'https://evil.example'}), 403)
            self.assertEqual(request('/api/chat/status', {'Sec-Fetch-Site': 'cross-site'}), 403)
            self.assertEqual(request('/api/chat/control', body={'action': 'stop'}), 403)
            self.assertEqual(request('/.git/config'), 404)
            self.assertEqual(request('/tools/kakao-bridge/.local/state.json'), 404)
            self.assertEqual(request('/beta/%2e%2e/%2e%2e/.env'), 404)
            self.assertEqual(request('/beta/'), 200)
            self.assertEqual(request('/beta/chat-parser.js'), 200)
        finally:
            server.shutdown()
            server.server_close()


if __name__ == '__main__':
    unittest.main()
