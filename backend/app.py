import os
import sys
import urllib.parse

# Ensure backend root directory is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

try:
    from dotenv import load_dotenv
    env_file = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_file):
        load_dotenv(env_file)
    else:
        load_dotenv()
except Exception:
    pass

from flask import Flask, send_from_directory, jsonify, session
from config import config_by_name, get_database_uri, get_engine_options
from models import db, Admin
from email_service import init_mail_config
from utils import setup_logger
from services import StudentService, NoticeService, SettingService
from routes import (
    auth_bp, student_bp, analytics_bp, ai_bp,
    admin_erp_bp, payment_bp, ticket_bp, attendance_bp, department_bp, course_bp, examination_bp, library_bp, transport_bp, notice_bp, setting_bp
)

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "dev")

    app = Flask(
        __name__,
        static_folder=os.path.join(os.path.dirname(BASE_DIR), "frontend"),
        template_folder=os.path.join(os.path.dirname(BASE_DIR), "frontend")
    )
    
    # Load Configuration
    config_cls = config_by_name.get(config_name, config_by_name["dev"])
    app.config.from_object(config_cls)

    # Database Configuration
    if config_name == "test" or os.environ.get("FLASK_ENV") == "test" or os.environ.get("TESTING") == "True":
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {}
    else:
        app.config["SQLALCHEMY_DATABASE_URI"] = get_database_uri()
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = get_engine_options(app.config["SQLALCHEMY_DATABASE_URI"])

    if os.environ.get("SECRET_KEY"):
        app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY")

    # Initialize Extensions
    db.init_app(app)
    mail = init_mail_config(app)
    setup_logger(app)

    # Ensure Uploads Directory exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # Security Headers Middleware
    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(admin_erp_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(ticket_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(department_bp)
    app.register_blueprint(course_bp)
    app.register_blueprint(examination_bp)
    app.register_blueprint(library_bp)
    app.register_blueprint(transport_bp)
    app.register_blueprint(notice_bp)
    app.register_blueprint(setting_bp)

    # Custom HTTP Error Handlers
    @app.errorhandler(404)
    def page_not_found(e):
        app.logger.warning(f"404 Not Found: {e}")
        return jsonify({"error": "Resource Not Found (404)", "message": "The requested page or endpoint does not exist."}), 404

    @app.errorhandler(403)
    def access_forbidden(e):
        app.logger.warning(f"403 Forbidden: {e}")
        return jsonify({"error": "Access Forbidden (403)", "message": "You do not have permission to access this resource."}), 403

    @app.errorhandler(500)
    def internal_server_error(e):
        app.logger.error(f"500 Internal Server Error: {e}")
        return jsonify({"error": "Internal Server Error (500)", "message": "An unexpected server error occurred."}), 500

    # HTML Page Routing
    @app.route("/")
    def index_page():
        return send_from_directory(app.static_folder, "index.html")

    @app.route("/view.html")
    def view_records():
        if not session.get("admin_id"):
            if session.get("student_id"):
                return send_from_directory(app.static_folder, "student-dashboard.html")
            return send_from_directory(app.static_folder, "login.html")
        return send_from_directory(app.static_folder, "view.html")

    @app.route("/login.html")
    def login_page():
        if session.get("admin_id"):
            return send_from_directory(app.static_folder, "view.html")
        return send_from_directory(app.static_folder, "login.html")

    @app.route("/student-login.html")
    def student_login_page():
        if session.get("student_id"):
            return send_from_directory(app.static_folder, "student-dashboard.html")
        return send_from_directory(app.static_folder, "student-login.html")

    @app.route("/student-dashboard.html")
    def student_dashboard_page():
        if not session.get("student_id"):
            return send_from_directory(app.static_folder, "student-login.html")
        return send_from_directory(app.static_folder, "student-dashboard.html")

    @app.route("/uploads/<filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    @app.route("/<path:path>")
    def catch_all_static(path):
        full_path = os.path.join(app.static_folder, path)
        if os.path.exists(full_path):
            return send_from_directory(app.static_folder, path)
        return jsonify({"error": "Resource Not Found", "path": path}), 404

    # Database Migration & Default Admin Seeding
    with app.app_context():
        try:
            db.create_all()
            with db.engine.connect() as conn:
                for col in ["photo", "marksheet10", "marksheet12", "leavingCertificate", "status"]:
                    try:
                        conn.execute(db.text(f"ALTER TABLE students ADD COLUMN {col} VARCHAR(255) NULL"))
                        conn.commit()
                    except Exception:
                        pass
                
                # Migration for Admission Verification Workflow
                for col_name, col_type in [
                    ("verification_remarks", "TEXT NULL"),
                    ("verified_at", "DATETIME NULL"),
                    ("verified_by", "VARCHAR(100) NULL"),
                    ("course", "VARCHAR(100) NULL"),
                    ("academic_year", "VARCHAR(20) DEFAULT '2026-27'"),
                    ("rejection_reason", "TEXT NULL"),
                    ("doc_status_photo", "VARCHAR(20) DEFAULT 'Pending'"),
                    ("doc_status_10th", "VARCHAR(20) DEFAULT 'Pending'"),
                    ("doc_status_12th", "VARCHAR(20) DEFAULT 'Pending'"),
                    ("doc_status_lc", "VARCHAR(20) DEFAULT 'Pending'"),
                    ("enrollment_number", "VARCHAR(50) NULL"),
                    ("is_enrolled", "BOOLEAN DEFAULT 0"),
                    ("enrolled_at", "DATETIME NULL")
                ]:
                    try:
                        conn.execute(db.text(f"ALTER TABLE students ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    except Exception:
                        pass

                # Migration for Fee & Payment Management Module
                for p_col, p_type in [
                    ("fee_type", "VARCHAR(100) DEFAULT 'Tuition Fee'"),
                    ("payment_method", "VARCHAR(50) DEFAULT 'UPI / Online'"),
                    ("payment_date", "DATETIME NULL"),
                    ("receipt_number", "VARCHAR(100) NULL"),
                    ("remarks", "TEXT NULL"),
                    ("recorded_by", "VARCHAR(100) DEFAULT 'admin'")
                ]:
                    try:
                        conn.execute(db.text(f"ALTER TABLE payments ADD COLUMN {p_col} {p_type}"))
                        conn.commit()
                    except Exception:
                        pass
        except Exception as e:
            app.logger.info(f"Migration note: {e}")

        # Seed Default Admin & Sample Enrolled Indian Students
        try:
            admin_user = Admin.query.filter_by(username="admin").first()
            if not admin_user:
                default_admin = Admin(
                    username="admin",
                    email="admin@zeal.edu.in"
                )
                default_admin.set_password("admin123")
                db.session.add(default_admin)
                db.session.commit()
                app.logger.info("Default admin user created successfully (username: admin, password: admin123)")

            if not app.config.get("TESTING") and not app.testing and os.getenv("TESTING") != "True":
                StudentService.seed_default_students()
                NoticeService.seed_default_notices()
                SettingService.seed_default_settings()
        except Exception as ae:
            app.logger.info(f"Seeding note: {ae}")

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)
