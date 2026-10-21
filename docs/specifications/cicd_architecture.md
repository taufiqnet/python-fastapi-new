                    GitHub
                       │
                       │ push
                       ▼
                GitHub Actions
                       │
              ┌────────┴────────┐
              │                 │
           Ruff              Pytest
              │                 │
              └────────┬────────┘
                       │
                  Docker Build
                       │
                       ▼
                  Docker Image
                       │
                       ▼
                  Production
                       │
              ┌────────┴────────┐
              │                 │
         Environment       PostgreSQL
          Variables           DB


# Recommended Final Structure:

python-fastapi-new/
│
├── app/
│   ├── __init__.py
│   ├── main.py
│   │
│   └── core/
│       ├── __init__.py
│       └── config.py
│
├── tests/
│   ├── __init__.py
│   └── test_tasks.py
│
├── .env
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
├── requirements.txt
└── README.md