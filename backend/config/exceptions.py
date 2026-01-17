from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    """
    커스텀 예외 핸들러 - API 명세에 맞는 에러 형식으로 변환
    """
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response_data = {
            'error': {
                'code': get_error_code(exc),
                'message': get_error_message(response.data),
                'details': response.data if isinstance(response.data, dict) else {}
            }
        }
        response.data = custom_response_data
    
    return response


def get_error_code(exc):
    """예외 타입에 따른 에러 코드 반환"""
    error_code_mapping = {
        'NotFound': 'RESOURCE_NOT_FOUND',
        'PermissionDenied': 'PERMISSION_DENIED',
        'ValidationError': 'VALIDATION_ERROR',
        'ParseError': 'PARSE_ERROR',
        'AuthenticationFailed': 'AUTHENTICATION_FAILED',
    }
    
    exc_class_name = exc.__class__.__name__
    return error_code_mapping.get(exc_class_name, 'UNKNOWN_ERROR')


def get_error_message(data):
    """에러 메시지 추출"""
    if isinstance(data, dict):
        # detail 키가 있으면 그것을 반환
        if 'detail' in data:
            return str(data['detail'])
        # 첫 번째 에러 메시지 반환
        for key, value in data.items():
            if isinstance(value, list) and len(value) > 0:
                return str(value[0])
            return str(value)
    elif isinstance(data, str):
        return data
    return '요청을 처리하는 중 오류가 발생했습니다.'
