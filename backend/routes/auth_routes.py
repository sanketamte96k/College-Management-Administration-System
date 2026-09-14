from datetime import timedelta
from flask import Blueprint, request, jsonify, session, send_from_directory, current_app
from models import Admin, Student
from utils import rate_limit, sanitize_input

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/api/login", methods=["POST"])
@rate_limit(max_attempts=10, window_seconds=60)
def api_login():
    data = request.get_json() or request.form or {}
    username_or_email = sanitize_input(data.get("username") or data.get("email"))
    password = (data.get("password") or "").strip()
    remember = data.get("remember")

    if not username_or_email or not password:
        return jsonify({"error": "Username/Email and Password are required"}), 400

    admin = Admin.query.filter(
        (Admin.username == username_or_email) | (Admin.email == username_or_email)
    ).first()

    if not admin or not admin.check_password(password):
        return jsonify({"error": "Invalid username or password"}), 401

    session.clear()
    session["admin_id"] = admin.id
    session["admin_username"] = admin.username
    session["user_type"] = "admin"
    session.permanent = True

    if remember and str(remember).lower() in ["true", "on", "1"]:
        current_app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)
    else:
        current_app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(minutes=30)

    user_info = admin.to_dict()
    user_info["role"] = "Administrator"
    user_info["avatar"] = "/images/admin-avatar.svg"

    return jsonify({
        "message": "Admin login successful",
        "user": user_info
    }), 200

@auth_bp.route("/api/logout", methods=["GET", "POST"])
def api_logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200

@auth_bp.route("/api/student-login", methods=["POST"])
@rate_limit(max_attempts=10, window_seconds=60)
def student_login():
    data = request.get_json() or request.form or {}
    app_id_raw = str(data.get("application_id") or data.get("id") or "").strip()
    dob = sanitize_input(data.get("dob"))

    if not app_id_raw or not dob:
        return jsonify({"error": "Application ID and Date of Birth are required"}), 400

    app_id_int = None
    if app_id_raw.isdigit():
        app_id_int = int(app_id_raw)
    elif "-" in app_id_raw:
        parts = app_id_raw.split("-")
        try:
            app_id_int = int(parts[-1])
        except (ValueError, IndexError):
            pass

    if app_id_int is None:
        return jsonify({"error": "Invalid Application ID format"}), 400

    student = Student.query.filter_by(id=app_id_int, dob=dob).first()
    if not student:
        return jsonify({"error": "Invalid Application ID or Date of Birth"}), 401

    session.clear()
    session["student_id"] = student.id
    session["user_type"] = "student"
    session.permanent = True
    current_app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(minutes=30)

    return jsonify({
        "message": "Student login successful",
        "student": student.to_dict()
    }), 200

@auth_bp.route("/api/student-logout", methods=["POST"])
def student_logout():
    session.clear()
    return jsonify({"message": "Student logged out successfully"}), 200

@auth_bp.route("/api/check-auth", methods=["GET"])
def check_auth():
    if session.get("admin_id"):
        return jsonify({
            "authenticated": True,
            "user_type": "admin",
            "username": session.get("admin_username"),
            "role": "Administrator",
            "avatar": "/images/admin-avatar.svg"
        }), 200
    elif session.get("student_id"):
        return jsonify({
            "authenticated": True,
            "user_type": "student",
            "student_id": session.get("student_id")
        }), 200
    return jsonify({"authenticated": False}), 401
