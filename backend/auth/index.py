'''
Business: Авторизация пользователей и управление аккаунтами
Args: event - dict с httpMethod, body, queryStringParameters
      context - объект с атрибутами request_id, function_name
Returns: HTTP response с данными пользователя или ошибкой
'''

import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
    
    try:
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            if action == 'login':
                login = body_data.get('login')
                password = body_data.get('password')
                
                cur.execute(
                    "SELECT id, login, display_name, is_admin, avatar_url, status FROM users WHERE login = %s AND password = %s",
                    (login, password)
                )
                user = cur.fetchone()
                
                if user:
                    cur.execute("UPDATE users SET status = 'online', last_seen = CURRENT_TIMESTAMP WHERE id = %s", (user['id'],))
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': headers,
                        'body': json.dumps({'success': True, 'user': dict(user)}),
                        'isBase64Encoded': False
                    }
                else:
                    return {
                        'statusCode': 401,
                        'headers': headers,
                        'body': json.dumps({'success': False, 'error': 'Неверный логин или пароль'}),
                        'isBase64Encoded': False
                    }
            
            elif action == 'logout':
                user_id = body_data.get('user_id')
                cur.execute("UPDATE users SET status = 'offline', last_seen = CURRENT_TIMESTAMP WHERE id = %s", (user_id,))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
            
            elif action == 'create_user':
                login = body_data.get('login')
                password = body_data.get('password')
                display_name = body_data.get('display_name')
                is_admin = body_data.get('is_admin', False)
                
                cur.execute(
                    "INSERT INTO users (login, password, display_name, is_admin) VALUES (%s, %s, %s, %s) RETURNING id, login, display_name, is_admin",
                    (login, password, display_name, is_admin)
                )
                new_user = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'success': True, 'user': dict(new_user)}),
                    'isBase64Encoded': False
                }
            
            elif action == 'update_user':
                user_id = body_data.get('user_id')
                display_name = body_data.get('display_name')
                password = body_data.get('password')
                
                if password:
                    cur.execute(
                        "UPDATE users SET display_name = %s, password = %s WHERE id = %s RETURNING id, login, display_name, is_admin",
                        (display_name, password, user_id)
                    )
                else:
                    cur.execute(
                        "UPDATE users SET display_name = %s WHERE id = %s RETURNING id, login, display_name, is_admin",
                        (display_name, user_id)
                    )
                
                updated_user = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'success': True, 'user': dict(updated_user)}),
                    'isBase64Encoded': False
                }
            
            cur.close()
            conn.close()
        
        elif method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            action = params.get('action')
            
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            if action == 'list_users':
                cur.execute("SELECT id, login, display_name, is_admin, status FROM users ORDER BY display_name")
                users = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'users': [dict(u) for u in users]}),
                    'isBase64Encoded': False
                }
            
            cur.close()
            conn.close()
        
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid request'}),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }