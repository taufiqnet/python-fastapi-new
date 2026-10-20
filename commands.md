
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

docker compose exec api pytest tests/test_customer.py -q

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


docker compose exec db psql -U postgres -l
netstat -ano | findstr :5432


**Find all the commands in the terminal executed:**
notepad (Get-PSReadLineOption).HistorySavePath

**generate a secret key**
python -c "import secrets; print(secrets.token_urlsafe(32))"


git status

git restore app/core/billing/feature_config.py

git status


---

### Next.js Frontend Development Commands:
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run Next.js development server (http://localhost:3000)
npm run dev

# Build for production validation
npm run build

# Export static files for cPanel (if output: 'export' enabled in next.config.ts)
npm run build
# Upload contents of frontend/out to cPanel public_html
```

### Full Multi-Container Local Docker (Backend + Frontend + DB):
```bash
# Start all 3 services: db (5432), api (8000), frontend (3000)
docker compose up --build -d

# Check status of all containers
docker compose ps

# View live logs
docker compose logs -f frontend
docker compose logs -f api

# Stop all containers
docker compose down
```

### Git Repository Separation Commands (When ready to push to 2 separate repos):
```bash
# Option 1: Clean initialization of frontend repo
cd frontend
git init
git add .
git commit -m "feat: initial Next.js frontend repository"
git remote add origin https://github.com/your-org/saas-frontend.git
git branch -M main
git push -u origin main

# Option 2: Retain full git commit history via git subtree
# (From repository root)
git subtree split -P frontend -b frontend-split
git push https://github.com/your-org/saas-frontend.git frontend-split:main
```
