import os
import sys
import pymysql
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

load_dotenv()

db_user = os.getenv("DB_USER") or os.getenv("MYSQL_USER", "root")
db_password = os.getenv("DB_PASSWORD") or os.getenv("MYSQL_PASSWORD")
db_host = os.getenv("DB_HOST") or os.getenv("MYSQL_HOST", "localhost")
db_name = os.getenv("DB_NAME") or os.getenv("MYSQL_DB", "college_admission_db")
db_port = int(os.getenv("DB_PORT") or os.getenv("MYSQL_PORT", "3306"))

if not db_password:
    print("❌ Error: DB_PASSWORD environment variable is not set.")
else:
    try:
        connect_kwargs = {
            "host": db_host,
            "user": db_user,
            "password": db_password,
            "database": db_name,
            "port": db_port,
        }

        ssl_mode = os.getenv("DB_SSL_MODE", "").upper()
        if (
            os.getenv("RENDER")
            or os.getenv("DB_SSL", "").lower() in ("true", "1", "yes", "required")
            or ssl_mode in ("REQUIRED", "REQUIRED_NO_VERIFY", "VERIFY_CA", "VERIFY_IDENTITY", "TRUE", "1")
            or "aivencloud.com" in db_host
        ):
            ca_path = (
                os.getenv("AIVEN_CA_CERT_PATH")
                or os.getenv("DB_SSL_CA")
                or os.getenv("MYSQL_ATTR_SSL_CA")
                or os.getenv("SSL_CA")
            )
            if ca_path:
                ssl_config = {"ca": ca_path, "check_hostname": True}
            else:
                ssl_config = {}
            connect_kwargs["ssl"] = ssl_config

        conn = pymysql.connect(**connect_kwargs)

        print("✅ Connected Successfully!")
        conn.close()

    except Exception as e:
        print("❌ Error:")
        print(e)