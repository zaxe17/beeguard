from flask import jsonify


def success(message: str = "OK", data=None, status: int = 200):
    return jsonify({
        "success": True,
        "message": message,
        "data": data if data is not None else {},
    }), status


def error(message: str = "Error", errors=None, status: int = 400):
    return jsonify({
        "success": False,
        "message": message,
        "errors": errors if errors is not None else [],
    }), status
