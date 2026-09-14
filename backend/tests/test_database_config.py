import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import unittest
from config import get_database_uri, get_engine_options, is_ssl_required, get_ssl_config


class TestDatabaseConfig(unittest.TestCase):
    def setUp(self):
        self.orig_env = os.environ.copy()

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.orig_env)

    def test_local_dev_configuration(self):
        """Local development uses MySQL without SSL encryption."""
        os.environ["FLASK_ENV"] = "dev"
        os.environ["TESTING"] = "False"
        os.environ["DB_USER"] = "root"
        os.environ["DB_PASSWORD"] = "Sanket@123"
        os.environ["DB_HOST"] = "localhost"
        os.environ["DB_PORT"] = "3306"
        os.environ["DB_NAME"] = "college_admission_db"
        for key in ["DATABASE_URL", "RENDER", "DB_SSL", "DB_SSL_MODE", "AIVEN_CA_CERT_PATH", "DB_SSL_CA"]:
            os.environ.pop(key, None)

        uri = get_database_uri()
        self.assertEqual(uri, "mysql+pymysql://root:Sanket%40123@localhost:3306/college_admission_db")
        self.assertFalse(is_ssl_required(uri))

        opts = get_engine_options(uri)
        self.assertNotIn("connect_args", opts)

    def test_render_aiven_without_ca_cert(self):
        """Render + Aiven MySQL without CA cert retains TLS without disabled hostname verification."""
        os.environ["FLASK_ENV"] = "prod"
        os.environ["TESTING"] = "False"
        os.environ["RENDER"] = "true"
        os.environ["DB_HOST"] = "college-management-db-sanketamte6584-cbc7j.aivencloud.com"
        os.environ["DB_PORT"] = "21160"
        os.environ["DB_USER"] = "avnadmin"
        os.environ["DB_PASSWORD"] = "AivenPass#2026"
        os.environ["DB_NAME"] = "defaultdb"
        for key in ["DATABASE_URL", "AIVEN_CA_CERT_PATH", "DB_SSL_CA", "MYSQL_ATTR_SSL_CA", "SSL_CA"]:
            os.environ.pop(key, None)

        uri = get_database_uri()
        self.assertNotIn("sqlite", uri)
        self.assertEqual(uri, "mysql+pymysql://avnadmin:AivenPass%232026@college-management-db-sanketamte6584-cbc7j.aivencloud.com:21160/defaultdb")
        self.assertTrue(is_ssl_required(uri))

        opts = get_engine_options(uri)
        self.assertIn("connect_args", opts)
        ssl_cfg = opts["connect_args"].get("ssl")
        self.assertIsInstance(ssl_cfg, dict)
        self.assertEqual(ssl_cfg, {})
        # Ensure disabled hostname verification is NOT present
        self.assertNotIn("check_hostname", ssl_cfg)

    def test_render_aiven_with_aiven_ca_cert_path(self):
        """When AIVEN_CA_CERT_PATH is provided, proper CA verification and hostname check are configured."""
        os.environ["FLASK_ENV"] = "prod"
        os.environ["TESTING"] = "False"
        os.environ["RENDER"] = "true"
        os.environ["DB_HOST"] = "college-management-db-sanketamte6584-cbc7j.aivencloud.com"
        os.environ["DB_PORT"] = "21160"
        os.environ["DB_USER"] = "avnadmin"
        os.environ["DB_PASSWORD"] = "AivenPass#2026"
        os.environ["DB_NAME"] = "defaultdb"
        os.environ["AIVEN_CA_CERT_PATH"] = "/etc/secrets/aiven-ca.pem"
        os.environ.pop("DATABASE_URL", None)

        uri = get_database_uri()
        opts = get_engine_options(uri)
        self.assertIn("connect_args", opts)
        ssl_cfg = opts["connect_args"]["ssl"]
        self.assertEqual(ssl_cfg.get("ca"), "/etc/secrets/aiven-ca.pem")
        self.assertTrue(ssl_cfg.get("check_hostname"))

    def test_render_aiven_with_db_ssl_ca_fallback(self):
        """When DB_SSL_CA fallback is provided, it is also supported with check_hostname=True."""
        os.environ["FLASK_ENV"] = "prod"
        os.environ["TESTING"] = "False"
        os.environ["RENDER"] = "true"
        os.environ["DB_HOST"] = "college-management-db-sanketamte6584-cbc7j.aivencloud.com"
        os.environ["DB_PORT"] = "21160"
        os.environ["DB_USER"] = "avnadmin"
        os.environ["DB_PASSWORD"] = "AivenPass#2026"
        os.environ["DB_NAME"] = "defaultdb"
        os.environ.pop("AIVEN_CA_CERT_PATH", None)
        os.environ["DB_SSL_CA"] = "/custom/certs/ca.pem"
        os.environ.pop("DATABASE_URL", None)

        uri = get_database_uri()
        opts = get_engine_options(uri)
        self.assertIn("connect_args", opts)
        ssl_cfg = opts["connect_args"]["ssl"]
        self.assertEqual(ssl_cfg.get("ca"), "/custom/certs/ca.pem")
        self.assertTrue(ssl_cfg.get("check_hostname"))

    def test_database_url_support_and_sanitization(self):
        """DATABASE_URL converts dialect and cleans unsupported ssl_mode query parameter."""
        os.environ["FLASK_ENV"] = "prod"
        os.environ["TESTING"] = "False"
        os.environ["DATABASE_URL"] = (
            "mysql://avnadmin:Secret%23Pass@college-management-db-sanketamte6584-cbc7j.aivencloud.com:21160/defaultdb"
            "?ssl_mode=REQUIRED&charset=utf8mb4"
        )
        uri = get_database_uri()
        self.assertTrue(uri.startswith("mysql+pymysql://"))
        self.assertNotIn("ssl_mode", uri)
        self.assertIn("charset=utf8mb4", uri)

        opts = get_engine_options(uri)
        self.assertIn("connect_args", opts)
        self.assertIn("ssl", opts["connect_args"])

    def test_testing_environment_isolation(self):
        """Test environment uses isolated in-memory SQLite with empty engine options."""
        os.environ["FLASK_ENV"] = "test"
        os.environ["TESTING"] = "True"
        uri = get_database_uri()
        self.assertEqual(uri, "sqlite:///:memory:")
        opts = get_engine_options(uri)
        self.assertEqual(opts, {})


if __name__ == "__main__":
    unittest.main()
