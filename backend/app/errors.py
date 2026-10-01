from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def validation_message(exc: RequestValidationError) -> str:
    for error in exc.errors():
        message = str(error.get("msg") or "")
        if message.startswith("Value error, "):
            return message.removeprefix("Value error, ")

        error_type = str(error.get("type") or "")
        if error_type == "missing":
            return "Заповніть усі обов’язкові поля."
        if error_type in {"string_too_short", "string_too_long"}:
            return "Перевірте довжину введених даних."
        if error_type in {"greater_than_equal", "less_than_equal", "int_parsing"}:
            return "Перевірте числове значення."
        if error_type in {"value_error", "email_parsing"}:
            return "Перевірте введені дані."
        if message:
            return message

    return "Перевірте введені дані."


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"detail": validation_message(exc)},
        )
