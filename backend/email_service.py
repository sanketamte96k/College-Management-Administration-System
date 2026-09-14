import os
import logging
from flask_mail import Mail, Message

# Safely load .env from the backend directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(BASE_DIR, ".env")

def _load_env_fallback(env_path):
    if not os.path.exists(env_path):
        return
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'\"")
                if k and k not in os.environ:
                    os.environ[k] = v
    except Exception:
        pass

try:
    from dotenv import load_dotenv
    load_dotenv(ENV_FILE)
except ImportError:
    _load_env_fallback(ENV_FILE)

logger = logging.getLogger(__name__)

def init_mail_config(app):
    """
    Initialize Flask-Mail configuration with SMTP credentials from environment variables.
    """
    mail_server = os.getenv("MAIL_SERVER", "smtp.gmail.com").strip()
    mail_port = int(os.getenv("MAIL_PORT", 587))
    mail_use_tls = os.getenv("MAIL_USE_TLS", "True").lower() == "true"
    mail_use_ssl = os.getenv("MAIL_USE_SSL", "False").lower() == "true" or mail_port == 465
    mail_username = (os.getenv("MAIL_USERNAME") or "admin@zeal.edu.in").strip()
    mail_password = (os.getenv("MAIL_PASSWORD") or "").strip()

    app.config["MAIL_SERVER"] = mail_server
    app.config["MAIL_PORT"] = mail_port
    app.config["MAIL_USE_TLS"] = mail_use_tls
    app.config["MAIL_USE_SSL"] = mail_use_ssl
    app.config["MAIL_USERNAME"] = mail_username
    app.config["MAIL_PASSWORD"] = mail_password

    raw_sender = os.getenv("MAIL_DEFAULT_SENDER", mail_username).strip()
    if isinstance(raw_sender, str) and not raw_sender.startswith("("):
        app.config["MAIL_DEFAULT_SENDER"] = ("Zeal College Admission System", raw_sender)
    else:
        app.config["MAIL_DEFAULT_SENDER"] = raw_sender

    app.config["MAIL_SUPPRESS_SEND"] = (
        os.getenv("MAIL_SUPPRESS_SEND", "False").lower() in ("true", "1", "yes") or app.config.get("TESTING", False)
    )
    mail_timeout = int(os.getenv("MAIL_TIMEOUT", 10))
    app.config["MAIL_TIMEOUT"] = mail_timeout
    try:
        import socket
        socket.setdefaulttimeout(float(mail_timeout))
    except Exception:
        pass
    
    mail = Mail(app)
    return mail


def is_email_suppressed():
    """
    Determine if email sending is suppressed via environment variable or app config.
    """
    try:
        from flask import current_app
        if current_app:
            val = current_app.config.get("MAIL_SUPPRESS_SEND")
            if val is True or str(val).lower() in ("true", "1", "yes"):
                return True
    except Exception:
        pass
    return os.getenv("MAIL_SUPPRESS_SEND", "False").lower() in ("true", "1", "yes")


def send_verification_status_email(mail, student, status, remarks=""):
    """
    Send verification decision email (Verified / Rejected) to the student with safe error handling.
    Failure to deliver email will never affect database verification.
    """
    if not mail:
        logger.warning("Flask-Mail instance is unavailable; skipping verification status email.")
        return False, "Email service not configured"

    student_email = (student.get("email") or "").strip()
    if not student_email or "@" not in student_email:
        logger.warning(f"No valid student email found for student ID #{student.get('id')}; skipping verification email.")
        return False, "No valid student email provided"

    try:
        is_verified = (status == "Verified")
        subject = (
            "Admission Application Verified - Zeal College"
            if is_verified
            else "Admission Application Update - Zeal College"
        )

        msg = Message(subject=subject, recipients=[student_email])

        header_color = "#059669" if is_verified else "#dc2626"
        status_tag_bg = "#dcfce7" if is_verified else "#fee2e2"
        status_tag_color = "#15803d" if is_verified else "#991b1b"
        status_text = "✅ Admission Verified & Approved" if is_verified else "❌ Admission Application Rejected"

        remarks_block = ""
        if remarks:
            remarks_block = f"""
            <div style="background: #f8fafc; border-left: 4px solid {header_color}; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 14px;">Verification Officer Remarks:</h4>
                <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">{remarks}</p>
            </div>
            """

        next_steps = (
            "<p>Congratulations! Your admission documents and eligibility have been verified by the Zeal College Admission Committee. Please log in to your student dashboard to review fee payment schedules and orientation details.</p>"
            if is_verified
            else "<p>We regret to inform you that your application could not be approved at this time. Please review the officer remarks above. If you need clarification or wish to re-submit missing credentials, please contact our admission helpdesk.</p>"
        )

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }}
                .email-card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }}
                .email-header {{ background: {header_color}; color: #ffffff; padding: 25px 30px; text-align: center; }}
                .email-header h1 {{ margin: 0; font-size: 22px; font-weight: 700; }}
                .email-header p {{ margin: 5px 0 0 0; font-size: 13px; color: #f8fafc; }}
                .email-body {{ padding: 30px; color: #334155; line-height: 1.6; }}
                .status-badge {{ display: inline-block; background: {status_tag_bg}; color: {status_tag_color}; font-weight: 700; padding: 8px 16px; border-radius: 20px; font-size: 14px; margin: 10px 0; }}
                .info-table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
                .info-table td {{ padding: 9px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }}
                .info-table td.label {{ font-weight: 600; color: #1e3a8a; width: 40%; }}
                .email-footer {{ background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
            </style>
        </head>
        <body>
            <div class="email-card">
                <div class="email-header">
                    <h1>🎓 Zeal College of Engineering</h1>
                    <p>Admission Verification Office</p>
                </div>
                <div class="email-body">
                    <h2>Admission Verification Decision</h2>
                    <p>Dear <strong>{student.get('fullName', 'Student')}</strong>,</p>
                    
                    <div style="text-align: center; margin: 15px 0;">
                        <span class="status-badge">{status_text}</span>
                    </div>

                    {next_steps}

                    {remarks_block}

                    <table class="info-table">
                        <tr><td class="label">Application ID:</td><td>#{student.get('id', 'N/A')}</td></tr>
                        <tr><td class="label">Candidate Name:</td><td>{student.get('fullName', '-')}</td></tr>
                        <tr><td class="label">Department:</td><td>{student.get('department', '-')}</td></tr>
                        <tr><td class="label">Admission Type:</td><td>{student.get('admissionType', '-')}</td></tr>
                        <tr><td class="label">Verification Date:</td><td>{student.get('verified_at', '-')}</td></tr>
                    </table>

                    <p style="margin-top: 20px;">
                        <a href="http://localhost:5000/student-login.html" style="background: #1e3a8a; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; display: inline-block; font-weight: 600;">Open Student Portal</a>
                    </p>
                </div>
                <div class="email-footer">
                    <p>© 2026 Zeal College of Engineering. All rights reserved.</p>
                    <p>Admission Helpline: admin@zeal.edu.in | +91 9921518878</p>
                </div>
            </div>
        </body>
        </html>
        """
        msg.html = html_content
        mail.send(msg)
        logger.info(f"Verification status ({status}) email sent successfully to {student_email}")
        return True, "Email sent successfully"
    except Exception as e:
        logger.warning(f"Failed to send verification email to {student_email}: {e}")
        return False, f"Unable to send notification email: {str(e)}"

def send_student_confirmation_email(mail, student):
    """
    Send HTML confirmation email to the student upon successful admission submission.
    Skips SMTP connection entirely if email sending is suppressed.
    """
    if is_email_suppressed():
        logger.info("Email notifications disabled; skipping student confirmation/admin notification.")
        return False, "Email notifications disabled"

    if not mail:
        logger.warning("Flask-Mail instance is unavailable; skipping confirmation email.")
        return False, "Email service not configured"

    student_email = student.get("email")
    if not student_email:
        logger.warning("No student email provided; skipping confirmation email.")
        return False, "No student email provided"

    try:
        subject = "Admission Application Received - Zeal College of Engineering"
        msg = Message(subject=subject, recipients=[student_email])

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }}
                .email-card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }}
                .email-header {{ background: #1e3a8a; color: #ffffff; padding: 25px 30px; text-align: center; }}
                .email-header h1 {{ margin: 0; font-size: 22px; font-weight: 700; }}
                .email-header p {{ margin: 5px 0 0 0; font-size: 13px; color: #cbd5e1; }}
                .email-body {{ padding: 30px; color: #334155; line-height: 1.6; }}
                .status-badge {{ display: inline-block; background: #fef3c7; color: #92400e; font-weight: 600; padding: 6px 14px; border-radius: 20px; font-size: 13px; margin: 10px 0; }}
                .info-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                .info-table td {{ padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }}
                .info-table td.label {{ font-weight: 600; color: #1e3a8a; width: 40%; }}
                .email-footer {{ background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
            </style>
        </head>
        <body>
            <div class="email-card">
                <div class="email-header">
                    <h1>🎓 Zeal College of Engineering</h1>
                    <p>Online Admission Management System</p>
                </div>
                <div class="email-body">
                    <h2>Application Confirmation</h2>
                    <p>Dear <strong>{student.get('fullName', 'Student')}</strong>,</p>
                    <p>Thank you for submitting your admission application to Zeal College of Engineering. We have successfully received your application details.</p>
                    
                    <div style="text-align: center;">
                        <span class="status-badge">Application Status: Pending Verification</span>
                    </div>

                    <table class="info-table">
                        <tr>
                            <td class="label">Application ID:</td>
                            <td>#{student.get('id', 'N/A')}</td>
                        </tr>
                        <tr>
                            <td class="label">Full Name:</td>
                            <td>{student.get('fullName', '-')}</td>
                        </tr>
                        <tr>
                            <td class="label">Department:</td>
                            <td>{student.get('department', '-')}</td>
                        </tr>
                        <tr>
                            <td class="label">Admission Type:</td>
                            <td>{student.get('admissionType', '-')}</td>
                        </tr>
                        <tr>
                            <td class="label">Submission Date:</td>
                            <td>{student.get('created_at', '-')}</td>
                        </tr>
                    </table>

                    <p>Our admission team is currently reviewing your application and submitted documents. You will receive further updates regarding your verification status via email.</p>
                    <p>If you have any questions, please contact our admission desk at <a href="mailto:admin@zeal.edu.in" style="color: #2563eb;">admin@zeal.edu.in</a>.</p>
                </div>
                <div class="email-footer">
                    <p>© 2026 Zeal College of Engineering. All rights reserved.</p>
                    <p>This is an automated confirmation email. Please do not reply directly to this message.</p>
                </div>
            </div>
        </body>
        </html>
        """
        msg.html = html_content
        mail.send(msg)
        logger.info(f"Student confirmation email sent to {student_email}")
        return True, "Email sent successfully"
    except Exception as e:
        logger.warning(f"Failed to send student confirmation email: {e}")
        return False, str(e)

def send_admin_notification_email(mail, student):
    """
    Send notification email to administrator when a new admission is submitted.
    Skips SMTP connection entirely if email sending is suppressed.
    """
    if is_email_suppressed():
        logger.info("Email notifications disabled; skipping admin notification.")
        return False, "Email notifications disabled"

    if not mail:
        logger.warning("Flask-Mail instance is unavailable; skipping admin notification.")
        return False, "Email service not configured"

    admin_email = os.getenv("ADMIN_EMAIL", "admin@zeal.edu.in")
    try:
        subject = f"New Admission Received - #{student.get('id')} ({student.get('fullName')})"
        msg = Message(subject=subject, recipients=[admin_email])

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: sans-serif; background: #f8fafc; padding: 20px; }}
                .card {{ max-width: 550px; background: white; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0; }}
                h2 {{ color: #1e3a8a; margin-top: 0; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
                td {{ padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }}
                .label {{ font-weight: bold; color: #475569; width: 40%; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h2>🚨 New Student Admission Alert</h2>
                <p>A new admission application has been registered in the system:</p>
                <table>
                    <tr><td class="label">Application ID:</td><td>#{student.get('id')}</td></tr>
                    <tr><td class="label">Student Name:</td><td>{student.get('fullName')}</td></tr>
                    <tr><td class="label">Department:</td><td>{student.get('department')}</td></tr>
                    <tr><td class="label">Email:</td><td>{student.get('email')}</td></tr>
                    <tr><td class="label">Mobile:</td><td>{student.get('mobile')}</td></tr>
                    <tr><td class="label">Admission Type:</td><td>{student.get('admissionType')}</td></tr>
                </table>
                <p style="margin-top: 20px;"><a href="http://localhost:5000/view.html" style="background: #1e3a8a; color: white; text-decoration: none; padding: 10px 18px; border-radius: 6px; display: inline-block;">View in Admin Portal</a></p>
            </div>
        </body>
        </html>
        """
        msg.html = html_content
        mail.send(msg)
        logger.info(f"Admin notification email sent for student #{student.get('id')}")
        return True, "Admin email sent"
    except Exception as e:
        logger.warning(f"Failed to send admin notification email: {e}")
        return False, str(e)




