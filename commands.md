
python -m venv venv
.\venv\Scripts\activate

pip install pydantic-settings
pip install sqlalchemy psycopg2-binary
pip install pyjwt pwdlib
pip install sqlalchemy asyncpg
pip install "pwdlib[argon2]"
pip install email-validator
pip install python-multipart
alembic init alembic
pip install asyncpg

docker build -t python-fastapi-new .
docker compose up --build
docker compose ps
docker compose down
docker compose up --build
docker compose logs -f
docker compose down -v
docker compose build api
docker compose up -d

docker compose exec api alembic revision --autogenerate -m "add users table"
docker compose exec api alembic --version
docker compose ps


docker compose build api
docker compose up -d
docker compose exec api alembic revision --autogenerate -m "add business_profile table and user business fields"
docker compose exec api alembic upgrade head


docker-compose up --build -d
docker-compose exec api pytest
docker-compose exec api pytest tests/test_products.py -v


**Find all the commands in the terminal executed:**
notepad (Get-PSReadLineOption).HistorySavePath

**generate a secret key**
python -c "import secrets; print(secrets.token_urlsafe(32))"