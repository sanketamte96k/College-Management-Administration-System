import os
import sys
from unittest.mock import patch, MagicMock

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import unittest
from app import create_app
from models import db, Student, Admin
from email_service import (
    send_student_confirmation_email,
    send_admin_notification_email,
    is_email_suppressed,
)


class TestEmailSuppression(unittest.TestCase):
    def setUp(self):
        self.orig_env = os.environ.copy()
        os.environ["TESTING"] = "True"
        os.environ["FLASK_ENV"] = "test"
        self.app = create_app("test")
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()

        db.create_all()

        self.student_payload = {
            "fullName": "Test Email Candidate",
            "fatherName": "Father",
            "motherName": "Mother",
            "dob": "2002-05-15",
            "gender": "Female",
            "bloodGroup": "O+",
            "mobile": "9811223344",
            "email": "test.candidate@zeal.edu.in",
            "aadhaar": "981122334455",
            "address": "456 Test Avenue",
            "city": "Pune",
            "state": "Maharashtra",
            "pincode": "411041",
            "nationality": "Indian",
            "board10": "State Board",
            "percentage10": "88.5",
            "board12": "HSC",
            "percentage12": "84.0",
            "entranceExam": "MHT-CET",
            "entranceScore": "92.4",
            "department": "Mechanical Engineering",
            "admissionType": "CAP",
        }

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
        os.environ.clear()
        os.environ.update(self.orig_env)

    def test_admission_when_email_suppressed_no_smtp_attempted(self):
        """When MAIL_SUPPRESS_SEND is True, no SMTP send is attempted and HTTP 201 with email_status 'disabled' is returned."""
        self.app.config["MAIL_SUPPRESS_SEND"] = True
        os.environ["MAIL_SUPPRESS_SEND"] = "true"

        mail_ext = self.app.extensions.get("mail")
        with patch.object(mail_ext, "send", MagicMock()) as mock_send:
            res = self.client.post("/api/students", data=self.student_payload)

            self.assertEqual(res.status_code, 201)
            data = res.get_json()
            self.assertIsNotNone(data)
            self.assertEqual(data.get("email_status"), "disabled")
            self.assertIn("Admission Submitted Successfully", data.get("message"))
            self.assertNotIn("Confirmation Email Sent", data.get("message"))

            # Verify student was successfully created in database
            self.assertIn("student", data)
            st_id = data["student"]["id"]
            db_st = Student.query.get(st_id)
            self.assertIsNotNone(db_st)
            self.assertEqual(db_st.fullName, "Test Email Candidate")

            # Crucial: verify mail.send was NEVER called!
            mock_send.assert_not_called()

    def test_admission_logging_when_email_suppressed(self):
        """Verify clear logging indicates email notifications are disabled and skipped."""
        self.app.config["MAIL_SUPPRESS_SEND"] = True
        os.environ["MAIL_SUPPRESS_SEND"] = "true"

        with self.assertLogs("app", level="INFO") as log_cm:
            res = self.client.post("/api/students", data=self.student_payload)
            self.assertEqual(res.status_code, 201)
            log_messages = " ".join(log_cm.output)
            self.assertIn("Email notifications disabled; skipping student confirmation/admin notification.", log_messages)

    def test_admission_when_email_enabled_and_smtp_succeeds(self):
        """When MAIL_SUPPRESS_SEND is False and SMTP works, email_status is 'sent' and mail.send is called."""
        self.app.config["MAIL_SUPPRESS_SEND"] = False
        os.environ["MAIL_SUPPRESS_SEND"] = "False"

        mail_ext = self.app.extensions.get("mail")
        with patch.object(mail_ext, "send", MagicMock()) as mock_send:
            res = self.client.post("/api/students", data=self.student_payload)

            self.assertEqual(res.status_code, 201)
            data = res.get_json()
            self.assertEqual(data.get("email_status"), "sent")
            self.assertIn("Confirmation Email Sent", data.get("message"))

            # mail.send should have been called for student and admin notifications
            self.assertGreaterEqual(mock_send.call_count, 1)

    def test_admission_when_email_enabled_and_smtp_fails(self):
        """When MAIL_SUPPRESS_SEND is False but SMTP throws an error or times out, student creation still succeeds with 201."""
        self.app.config["MAIL_SUPPRESS_SEND"] = False
        os.environ["MAIL_SUPPRESS_SEND"] = "False"

        import smtplib
        mail_ext = self.app.extensions.get("mail")
        with patch.object(mail_ext, "send", side_effect=smtplib.SMTPConnectError(421, b"Connection refused")):
            res = self.client.post("/api/students", data=self.student_payload)

            # Crucial: Endpoint must NEVER fail or return 500 when SMTP fails
            self.assertEqual(res.status_code, 201)
            data = res.get_json()
            self.assertEqual(data.get("email_status"), "failed")
            self.assertIn("Admission Submitted Successfully", data.get("message"))

            # Student must still be safely stored in the database
            st_id = data["student"]["id"]
            db_st = Student.query.get(st_id)
            self.assertIsNotNone(db_st)

    def test_direct_email_service_functions_when_suppressed(self):
        """Direct calls to send_student_confirmation_email and send_admin_notification_email skip SMTP when suppressed."""
        self.app.config["MAIL_SUPPRESS_SEND"] = True
        os.environ["MAIL_SUPPRESS_SEND"] = "true"

        mail_ext = self.app.extensions.get("mail")
        with patch.object(mail_ext, "send", MagicMock()) as mock_send:
            student_dict = {"id": 1, "fullName": "Test", "email": "test@zeal.edu.in"}
            success, msg = send_student_confirmation_email(mail_ext, student_dict)
            self.assertFalse(success)
            self.assertIn("disabled", msg.lower())

            admin_success, admin_msg = send_admin_notification_email(mail_ext, student_dict)
            self.assertFalse(admin_success)
            self.assertIn("disabled", admin_msg.lower())

            mock_send.assert_not_called()


if __name__ == "__main__":
    unittest.main()
