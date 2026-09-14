import os
import sys
from urllib.parse import quote_plus, urlparse, parse_qs, urlencode, urlunparse
from datetime import timedelta

try:
    from dotenv import load_dotenv
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(backend_dir, ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        load_dotenv()
except Exception:
    pass


def is_test_environment():
    """
    Determine if running in an isolated test environment.
    Explicit 'dev' or 'prod' environment or TESTING='False' takes precedence.
    """
    if os.getenv("TESTING") == "False" or os.getenv("FLASK_ENV") in ("dev", "prod"):
        return False
    if os.getenv("FLASK_ENV") == "test" or os.getenv("TESTING") in ("True", "true", "1"):
        return True
    if len(sys.argv) > 0 and ("pytest" in os.path.basename(sys.argv[0]) or "unittest" in os.path.basename(sys.argv[0]) or os.path.basename(sys.argv[0]).startswith("test")):
        return True
    return False


def get_database_uri():
    """
    Resolve and validate the database connection URI.
    Supports DATABASE_URL or individual DB_USER, DB_PASSWORD, DB_HOST, DB_NAME variables.
    Fails with a clear configuration error if required credentials are missing.
    """
    # Test environment fallback
    if is_test_environment():
        return "sqlite:///:memory:"

    # 1. If DATABASE_URL is provided, normalize and clean it
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        parsed = urlparse(database_url)
        scheme = parsed.scheme
        if scheme == "mysql":
            scheme = "mysql+pymysql"
        elif scheme == "postgres":
            scheme = "postgresql"

        # PyMySQL does not support ssl_mode as a connection URI query parameter.
        # Clean SSL-related query params from the URL so PyMySQL does not raise TypeError,
        # while get_engine_options() configures SSL in connect_args.
        query_params = parse_qs(parsed.query)
        cleaned_params = {k: v for k, v in query_params.items() if k.lower() not in ("ssl_mode", "sslmode", "ssl-mode", "ssl")}
        new_query = urlencode(cleaned_params, doseq=True)
        return urlunparse(parsed._replace(scheme=scheme, query=new_query))

    # 2. Build MySQL connection from environment variables
    db_user = os.environ.get("DB_USER") or os.environ.get("MYSQL_USER", "root")
    db_password_raw = os.environ.get("DB_PASSWORD") or os.environ.get("MYSQL_PASSWORD")
    if not db_password_raw:
        raise RuntimeError("Database configuration error: DB_PASSWORD must be configured. Please set the DB_PASSWORD environment variable or provide DATABASE_URL.")
    db_password = quote_plus(db_password_raw)
    db_host = os.environ.get("DB_HOST") or os.environ.get("MYSQL_HOST", "localhost")
    db_name = os.environ.get("DB_NAME") or os.environ.get("MYSQL_DB", "college_admission_db")
    db_port = os.environ.get("DB_PORT") or os.environ.get("MYSQL_PORT", "3306")

    # 3. Safely encode the password with quote_plus
    return f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


def is_ssl_required(db_uri=None):
    """
    Determine if SSL/TLS is required for the database connection.
    Required for Aiven MySQL and Render deployments.
    """
    # Explicit SSL request flags
    ssl_mode = os.getenv("DB_SSL_MODE", "").upper()
    if ssl_mode in ("REQUIRED", "REQUIRED_NO_VERIFY", "VERIFY_CA", "VERIFY_IDENTITY", "TRUE", "1"):
        return True
    if os.getenv("DB_SSL", "").lower() in ("true", "1", "yes", "required"):
        return True
    if os.getenv("MYSQL_SSL", "").lower() in ("true", "1", "yes", "required"):
        return True

    # Render production environment flag
    if os.getenv("RENDER"):
        return True

    # Host or URL indicators (e.g. Aiven Cloud)
    db_host = os.getenv("DB_HOST", "")
    if "aivencloud.com" in db_host:
        return True

    raw_database_url = os.getenv("DATABASE_URL", "")
    if "aivencloud.com" in raw_database_url:
        return True

    if raw_database_url:
        parsed = urlparse(raw_database_url)
        query = parsed.query.lower()
        if "ssl_mode=required" in query or "sslmode=require" in query or "ssl=true" in query:
            return True

    if db_uri and "aivencloud.com" in db_uri:
        return True

    return False


def get_ssl_config(db_uri=None):
    """
    Build SSL configuration dictionary for PyMySQL / SQLAlchemy.
    - When Aiven CA certificate is available (via AIVEN_CA_CERT_PATH or fallback vars),
      configures full verification with check_hostname=True.
    - When no CA certificate is configured, maintains TLS encryption without
      hardcoding certificates and without disabling hostname verification.
    """
    ca_path = (
        os.getenv("AIVEN_CA_CERT_PATH")
        or os.getenv("DB_SSL_CA")
        or os.getenv("MYSQL_ATTR_SSL_CA")
        or os.getenv("SSL_CA")
    )
    if ca_path:
        return {"ca": ca_path, "check_hostname": True}

    # TLS enabled without disabled hostname verification flag
    return {}


def get_engine_options(db_uri=None):
    """
    Generate SQLAlchemy engine options based on the connection URI and environment.
    Configures pool settings and SSL/TLS connect_args when connecting to Aiven/Render.
    """
    if db_uri and db_uri.startswith("sqlite"):
        return {}

    options = {
        "pool_recycle": 280,
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20
    }

    if is_ssl_required(db_uri):
        options["connect_args"] = {"ssl": get_ssl_config(db_uri)}

    return options



class Config:
    """Base Configuration"""

    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "zeal_college_production_erp_secret_2026"
    )

    PERMANENT_SESSION_LIFETIME = timedelta(minutes=30)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    # Uploads directory
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_FOLDER = os.getenv(
        "UPLOAD_FOLDER",
        os.path.join(BASE_DIR, "uploads")
    )
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB

    # Attendance Configuration
    ATTENDANCE_MIN_PERCENTAGE = float(os.getenv("ATTENDANCE_MIN_PERCENTAGE", 75.0))

    # ==========================
    # Database Configuration
    # ==========================

    DATABASE_URL = os.getenv("DATABASE_URL")
    DB_USER = os.getenv("DB_USER") or os.getenv("MYSQL_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD") or os.getenv("MYSQL_PASSWORD")
    DB_HOST = os.getenv("DB_HOST") or os.getenv("MYSQL_HOST")
    DB_NAME = os.getenv("DB_NAME") or os.getenv("MYSQL_DB")
    DB_PORT = os.getenv("DB_PORT") or os.getenv("MYSQL_PORT", "3306")

    SQLITE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'college_admission.db')}"
    SQLALCHEMY_DATABASE_URI = get_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = get_engine_options(SQLALCHEMY_DATABASE_URI)

    # ==========================
    # Mail Configuration
    # ==========================

    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True").lower() == "true"
    MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "False").lower() == "true" or int(os.getenv("MAIL_PORT", 587)) == 465

    MAIL_USERNAME = os.getenv(
        "MAIL_USERNAME",
        "admin@zeal.edu.in"
    )

    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")

    MAIL_DEFAULT_SENDER = (
        "Zeal College Admission System",
        os.getenv("MAIL_USERNAME", "admin@zeal.edu.in")
    )

    MAIL_SUPPRESS_SEND = (
        os.getenv("MAIL_SUPPRESS_SEND", "False").lower() == "true"
    )
    MAIL_TIMEOUT = int(os.getenv("MAIL_TIMEOUT", 10))


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    MAIL_SUPPRESS_SEND = True


config_by_name = {
    "dev": DevelopmentConfig,
    "prod": ProductionConfig,
    "test": TestingConfig,
}