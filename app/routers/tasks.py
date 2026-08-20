from fastapi import APIRouter

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
)

tasks = []


@router.get("/")
def get_tasks():
    return tasks


@router.post("/")
def create_task(title: str):
    task = {
        "id": len(tasks) + 1,
        "title": title,
        "completed": False,
    }

    tasks.append(task)

    return task