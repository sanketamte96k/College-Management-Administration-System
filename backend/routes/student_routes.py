import os
from flask import Blueprint, request, jsonify, session, current_app

from services import StudentService
from email_service import (
    send_student_confirmation_email,
    send_admin_notification_email,
    send_verification_status_email,
    is_email_suppressed
)
from utils import admin_required, student_required


student_bp = Blueprint("students", __name__)


# ============================================================
# GET ALL STUDENTS
# ============================================================
@student_bp.route("/api/students", methods=["GET"])
def get_students():
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 50, type=int)

    search_query = request.args.get("search", "", type=str).strip()
    department = request.args.get("dept", "", type=str).strip() or request.args.get("department", "", type=str).strip()
    course = request.args.get("course", "", type=str).strip()
    academic_year = request.args.get("academic_year", "", type=str).strip()
    admission_type = request.args.get("admission_type", "", type=str).strip()
    gender = request.args.get("gender", "", type=str).strip()
    status = request.args.get("status", "", type=str).strip()
    from_date = request.args.get("from_date", "", type=str).strip()
    to_date = request.args.get("to_date", "", type=str).strip()

    try:
        result = StudentService.get_all_students(
            page=page,
            limit=limit,
            search_query=search_query,
            department=department,
            course=course,
            academic_year=academic_year,
            admission_type=admission_type,
            gender=gender,
            status=status,
            from_date=from_date,
            to_date=to_date
        )

        if "page" not in request.args:
            return jsonify(result["students"]), 200

        return jsonify(result), 200

    except Exception as e:
        current_app.logger.exception(
            "Error fetching students"
        )

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# GET STUDENTS MODULE KPI STATS
# ============================================================
@student_bp.route("/api/students/stats", methods=["GET"])
def get_students_stats():
    try:
        stats = StudentService.get_students_kpi_stats()
        return jsonify(stats), 200
    except Exception as e:
        current_app.logger.exception("Error fetching student KPI stats")
        return jsonify({"error": str(e)}), 500


# ============================================================
# GET SINGLE STUDENT
# ============================================================
@student_bp.route(
    "/api/students/<int:student_id>",
    methods=["GET"]
)
def get_student(student_id):
    try:
        student = StudentService.get_student_by_id(
            student_id
        )

        if not student:
            return jsonify({
                "error": "Student not found"
            }), 404

        return jsonify(
            student.to_dict()
        ), 200

    except Exception as e:
        current_app.logger.exception(
            "Error fetching student"
        )

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# CREATE NEW STUDENT / ADMISSION
# ============================================================
@student_bp.route(
    "/api/students",
    methods=["POST"]
)
def create_student():

    # --------------------------------------------------------
    # IMPORTANT:
    # Admission form contains file uploads.
    #
    # Therefore the browser sends:
    # multipart/form-data
    #
    # request.get_json() must NOT be called blindly because
    # Flask can return HTTP 415 for multipart requests.
    # --------------------------------------------------------

    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict()

    files = request.files

    current_app.logger.info(
        "Creating new student admission"
    )

    current_app.logger.info(
        "Received form fields: %s",
        list(data.keys())
    )

    current_app.logger.info(
        "Received files: %s",
        list(files.keys())
    )

    try:
        # ----------------------------------------------------
        # CREATE STUDENT
        # ----------------------------------------------------
        new_student = StudentService.create_student(
            data=data,
            files=files,
            upload_folder=current_app.config[
                "UPLOAD_FOLDER"
            ]
        )

        student_dict = new_student.to_dict()

        # ----------------------------------------------------
        # EMAIL NOTIFICATIONS
        # ----------------------------------------------------
        mail_suppressed = is_email_suppressed()

        if mail_suppressed:
            current_app.logger.info(
                "Email notifications disabled; skipping student confirmation/admin notification."
            )
            return jsonify({
                "message": "Admission Submitted Successfully.",
                "student": student_dict,
                "email_status": "disabled",
                "email_note": "Email notifications are disabled."
            }), 201

        mail_ext = current_app.extensions.get("mail")

        email_sent = False
        email_msg = ""

        if mail_ext:
            try:
                # Send confirmation email to student
                email_sent, email_msg = (
                    send_student_confirmation_email(
                        mail_ext,
                        student_dict
                    )
                )

                # Send notification to admin
                send_admin_notification_email(
                    mail_ext,
                    student_dict
                )
            except Exception as mail_err:
                current_app.logger.warning(
                    f"Unexpected email error during student creation: {mail_err}"
                )
                email_sent = False
                email_msg = str(mail_err)

        # ----------------------------------------------------
        # SUCCESS + EMAIL SENT
        # ----------------------------------------------------
        if email_sent:
            return jsonify({
                "message": (
                    "Admission Submitted Successfully "
                    "and Confirmation Email Sent!"
                ),
                "student": student_dict,
                "email_status": "sent"
            }), 201

        # ----------------------------------------------------
        # SUCCESS BUT EMAIL FAILED
        # ----------------------------------------------------
        return jsonify({
            "message": (
                "Admission Submitted Successfully. "
                "Email notification could not be delivered."
            ),
            "student": student_dict,
            "email_status": "failed",
            "email_note": email_msg
        }), 201

    except Exception as e:

        current_app.logger.exception(
            "Error creating student admission"
        )

        return jsonify({
            "error": str(e)
        }), 400


# ============================================================
# UPDATE STUDENT
# ============================================================
@student_bp.route(
    "/api/students/<int:student_id>",
    methods=["PUT"]
)
def update_student(student_id):

    # Handle both JSON and multipart/form-data
    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict()

    files = request.files

    try:
        student = StudentService.update_student(
            student_id=student_id,
            data=data,
            files=files,
            upload_folder=current_app.config[
                "UPLOAD_FOLDER"
            ]
        )

        if not student:
            return jsonify({
                "error": "Student record not found"
            }), 404

        return jsonify({
            "message": "Student updated successfully",
            "student": student.to_dict()
        }), 200

    except Exception as e:

        current_app.logger.exception(
            "Error updating student"
        )

        return jsonify({
            "error": str(e)
        }), 400


# ============================================================
# DELETE STUDENT
# ============================================================
@student_bp.route(
    "/api/students/<int:student_id>",
    methods=["DELETE"]
)
def delete_student(student_id):

    try:
        success = StudentService.delete_student(
            student_id,
            current_app.config["UPLOAD_FOLDER"]
        )

        if not success:
            return jsonify({
                "error": "Unable to delete student"
            }), 400

        return jsonify({
            "message": "Student deleted successfully"
        }), 200

    except Exception as e:

        current_app.logger.exception(
            "Error deleting student"
        )

        return jsonify({
            "error": str(e)
        }), 400


# ============================================================
# UPDATE ADMISSION VERIFICATION DECISION
# ============================================================
# UPDATE ADMISSION VERIFICATION DECISION
# ============================================================
@student_bp.route(
    "/api/students/<int:student_id>/verification",
    methods=["PUT", "PATCH", "POST"]
)
@admin_required
def update_student_verification(student_id):
    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict()

    raw_status = (
        data.get("status") or 
        data.get("admissionStatus") or 
        data.get("admission_status") or 
        ""
    ).strip()

    remarks = (
        data.get("remarks") or 
        data.get("verificationRemarks") or 
        data.get("verification_remarks") or 
        data.get("comments") or 
        ""
    ).strip()

    admin_username = session.get("admin_username") or "admin"

    if not raw_status:
        return jsonify({
            "success": False,
            "error": "Verification status is required"
        }), 400

    try:
        updated_student = StudentService.update_verification(
            student_id=student_id,
            status=raw_status,
            remarks=remarks,
            admin_username=admin_username
        )

        if not updated_student:
            return jsonify({
                "success": False,
                "error": f"Student record #{student_id} not found"
            }), 404

        student_dict = updated_student.to_dict()
        final_status = updated_student.status

        # Email notification handling (safe fallback)
        email_status = "not_applicable"
        email_note = ""
        mail_ext = current_app.extensions.get("mail")

        if final_status in ["Verified", "Rejected"]:
            if mail_ext:
                try:
                    email_sent, note = send_verification_status_email(
                        mail_ext,
                        student_dict,
                        final_status,
                        remarks
                    )
                    email_status = "sent" if email_sent else "failed"
                    email_note = note
                except Exception as mail_err:
                    current_app.logger.warning(f"Verification email notice error: {mail_err}")
                    email_status = "failed"
                    email_note = f"Unable to send notification email: {str(mail_err)}"
            else:
                email_status = "failed"
                email_note = "Unable to send notification email (mail service not initialized)"

        msg = (
            "Admission verified successfully"
            if final_status == "Verified"
            else "Admission rejected successfully"
            if final_status == "Rejected"
            else f"Admission status updated to '{final_status}' successfully"
        )

        return jsonify({
            "success": True,
            "message": msg,
            "status": final_status,
            "student": student_dict,
            "email_status": email_status,
            "email_note": email_note
        }), 200

    except ValueError as ve:
        return jsonify({
            "success": False,
            "error": str(ve)
        }), 400
    except Exception as e:
        current_app.logger.exception("Error updating verification status")
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500


# ============================================================
# GET LOGGED-IN STUDENT PROFILE
# ============================================================
@student_bp.route(
    "/api/student/profile",
    methods=["GET"]
)
@student_required
def get_student_profile():

    student_id = session.get("student_id")

    try:
        student = StudentService.get_student_by_id(
            student_id
        )

        if not student:
            return jsonify({
                "error": "Student profile not found"
            }), 404

        return jsonify(
            student.to_dict()
        ), 200

    except Exception as e:

        current_app.logger.exception(
            "Error fetching student profile"
        )

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# UPDATE LOGGED-IN STUDENT PROFILE
# ============================================================
@student_bp.route(
    "/api/student/profile",
    methods=["PUT"]
)
@student_required
def update_student_profile():

    student_id = session.get("student_id")

    # Handle both JSON and form requests
    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict()

    # --------------------------------------------------------
    # Only allow contact information to be updated
    # --------------------------------------------------------
    allowed_keys = [
        "mobile",
        "altMobile",
        "email",
        "address",
        "city",
        "state",
        "pincode"
    ]

    contact_data = {
        key: value
        for key, value in data.items()
        if key in allowed_keys
    }

    try:
        student = StudentService.update_student(
            student_id=student_id,
            data=contact_data,
            files={},
            upload_folder=current_app.config[
                "UPLOAD_FOLDER"
            ]
        )

        if not student:
            return jsonify({
                "error": "Student profile not found"
            }), 404

        return jsonify({
            "message": (
                "Contact details updated successfully"
            ),
            "student": student.to_dict()
        }), 200

    except Exception as e:

        current_app.logger.exception(
            "Error updating student profile"
        )

        return jsonify({
            "error": str(e)
        }), 400


# ============================================================
# ADMISSIONS ANALYTICS & STATS
# ============================================================
@student_bp.route("/api/admissions/analytics", methods=["GET"])
@admin_required
def get_admissions_analytics():
    try:
        analytics = StudentService.get_admissions_analytics()
        return jsonify(analytics), 200
    except Exception as e:
        current_app.logger.exception("Error getting admissions analytics")
        return jsonify({"error": str(e)}), 500


# ============================================================
# VERIFY SINGLE APPLICATION DOCUMENT
# ============================================================
@student_bp.route("/api/admissions/<int:student_id>/verify-document", methods=["POST"])
@admin_required
def verify_admission_document(student_id):
    data = request.get_json(silent=True) or request.form.to_dict()
    doc_type = data.get("doc_type") or data.get("documentType") or ""
    status = data.get("status") or "Verified"
    reason = data.get("reason") or data.get("remarks") or ""
    admin_username = session.get("admin_username") or "admin"

    try:
        student, msg = StudentService.verify_document(
            student_id=student_id,
            doc_type=doc_type,
            status=status,
            reason=reason,
            admin_username=admin_username
        )
        if not student:
            return jsonify({"success": False, "error": msg}), 400

        return jsonify({
            "success": True,
            "message": msg,
            "student": student.to_dict()
        }), 200
    except Exception as e:
        current_app.logger.exception("Error verifying document")
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# APPROVE ADMISSION APPLICATION
# ============================================================
@student_bp.route("/api/admissions/<int:student_id>/approve", methods=["POST"])
@admin_required
def approve_admission_application(student_id):
    admin_username = session.get("admin_username") or "admin"
    try:
        student, msg = StudentService.approve_application(
            student_id=student_id,
            admin_username=admin_username
        )
        if not student:
            return jsonify({"success": False, "error": msg}), 400

        # Attempt to send verification status email
        mail_ext = current_app.extensions.get("mail")
        if mail_ext:
            try:
                send_verification_status_email(mail_ext, student.to_dict(), "Approved", "Congratulations! Your admission application has been approved.")
            except Exception as mail_err:
                current_app.logger.warning(f"Approval email failed: {mail_err}")

        return jsonify({
            "success": True,
            "message": msg,
            "student": student.to_dict()
        }), 200
    except Exception as e:
        current_app.logger.exception("Error approving application")
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# REJECT ADMISSION APPLICATION
# ============================================================
@student_bp.route("/api/admissions/<int:student_id>/reject", methods=["POST"])
@admin_required
def reject_admission_application(student_id):
    data = request.get_json(silent=True) or request.form.to_dict()
    reason = data.get("reason") or data.get("remarks") or data.get("rejection_reason") or ""
    admin_username = session.get("admin_username") or "admin"

    try:
        student, msg = StudentService.reject_application(
            student_id=student_id,
            reason=reason,
            admin_username=admin_username
        )
        if not student:
            return jsonify({"success": False, "error": msg}), 400

        # Attempt to send verification status email
        mail_ext = current_app.extensions.get("mail")
        if mail_ext:
            try:
                send_verification_status_email(mail_ext, student.to_dict(), "Rejected", reason)
            except Exception as mail_err:
                current_app.logger.warning(f"Rejection email failed: {mail_err}")

        return jsonify({
            "success": True,
            "message": msg,
            "student": student.to_dict()
        }), 200
    except Exception as e:
        current_app.logger.exception("Error rejecting application")
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# CONVERT APPROVED APPLICANT TO ENROLLED STUDENT
# ============================================================
@student_bp.route("/api/admissions/<int:student_id>/convert-to-student", methods=["POST"])
@admin_required
def convert_applicant_to_student(student_id):
    admin_username = session.get("admin_username") or "admin"
    try:
        student, msg = StudentService.convert_to_student(
            student_id=student_id,
            admin_username=admin_username
        )
        if not student:
            return jsonify({"success": False, "error": msg}), 400

        return jsonify({
            "success": True,
            "message": msg,
            "zprn": student.enrollment_number,
            "enrollment_number": student.enrollment_number,
            "student": student.to_dict()
        }), 200
    except Exception as e:
        current_app.logger.exception("Error converting application to student")
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# EXPORT ADMISSIONS CSV REPORT
# ============================================================
@student_bp.route("/api/admissions/export", methods=["GET"])
@admin_required
def export_admissions_csv():
    import csv
    import io
    from flask import Response

    search_query = request.args.get("search", "", type=str).strip()
    department = request.args.get("dept", "", type=str).strip() or request.args.get("department", "", type=str).strip()
    course = request.args.get("course", "", type=str).strip()
    academic_year = request.args.get("academic_year", "", type=str).strip()
    status = request.args.get("status", "", type=str).strip()

    try:
        result = StudentService.get_all_students(
            page=1,
            limit=5000,
            search_query=search_query,
            department=department,
            course=course,
            academic_year=academic_year,
            status=status
        )

        students_data = result["students"]
        output = io.StringIO()
        writer = csv.writer(output)

        # Write Header
        writer.writerow([
            "Application ID", "Enrollment Number", "Full Name", "Father Name", "Mother Name",
            "DOB", "Gender", "Email", "Mobile", "Aadhaar", "Department", "Course",
            "Academic Year", "Admission Type", "10th %", "12th %", "Entrance Score",
            "Status", "Is Enrolled", "Created At"
        ])

        for s in students_data:
            writer.writerow([
                s.get("application_id", ""),
                s.get("enrollment_number", ""),
                s.get("fullName", ""),
                s.get("fatherName", ""),
                s.get("motherName", ""),
                s.get("dob", ""),
                s.get("gender", ""),
                s.get("email", ""),
                s.get("mobile", ""),
                s.get("aadhaar", ""),
                s.get("department", ""),
                s.get("course", ""),
                s.get("academic_year", ""),
                s.get("admissionType", ""),
                s.get("percentage10", ""),
                s.get("percentage12", ""),
                s.get("entranceScore", ""),
                s.get("status", ""),
                "Yes" if s.get("is_enrolled") else "No",
                s.get("created_at", "")
            ])

        response = Response(output.getvalue(), mimetype="text/csv")
        response.headers["Content-Disposition"] = "attachment; filename=Zeal_Admissions_Report.csv"
        return response

    except Exception as e:
        current_app.logger.exception("Error exporting admissions CSV")
        return jsonify({"error": str(e)}), 500