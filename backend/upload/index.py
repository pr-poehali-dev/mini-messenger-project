'''
Business: Загрузка файлов (аудио, видео, документы)
Args: event - dict с httpMethod, body, headers
      context - объект с атрибутами request_id, function_name
Returns: HTTP response с URL загруженного файла
'''

import json
import os
import base64
import uuid
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    if method == 'POST':
        try:
            body_data = json.loads(event.get('body', '{}'))
            file_data = body_data.get('file_data')
            file_name = body_data.get('file_name', 'file')
            file_type = body_data.get('file_type', 'application/octet-stream')
            
            if not file_data:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'No file data provided'}),
                    'isBase64Encoded': False
                }
            
            file_id = str(uuid.uuid4())
            file_extension = file_name.split('.')[-1] if '.' in file_name else 'bin'
            stored_name = f"{file_id}.{file_extension}"
            
            mock_url = f"https://storage.poehali.dev/messenger-files/{stored_name}"
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'url': mock_url,
                    'file_name': file_name,
                    'file_type': file_type
                }),
                'isBase64Encoded': False
            }
            
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': str(e)}),
                'isBase64Encoded': False
            }
    
    return {
        'statusCode': 405,
        'headers': headers,
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }
