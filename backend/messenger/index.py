'''
Business: Управление контактами, чатами и сообщениями
Args: event - dict с httpMethod, body, queryStringParameters
      context - объект с атрибутами request_id, function_name
Returns: HTTP response с данными чатов и сообщений
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
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'add_contact':
                user_id = body_data.get('user_id')
                contact_login = body_data.get('contact_login')
                
                cur.execute("SELECT id FROM users WHERE login = %s", (contact_login,))
                contact = cur.fetchone()
                
                if not contact:
                    return {
                        'statusCode': 404,
                        'headers': headers,
                        'body': json.dumps({'success': False, 'error': 'Пользователь не найден'}),
                        'isBase64Encoded': False
                    }
                
                contact_id = contact['id']
                
                cur.execute(
                    "INSERT INTO contacts (user_id, contact_user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (user_id, contact_id)
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
            
            elif action == 'send_message':
                sender_id = body_data.get('sender_id')
                receiver_id = body_data.get('receiver_id')
                message_text = body_data.get('message_text')
                message_type = body_data.get('message_type', 'text')
                media_url = body_data.get('media_url')
                
                cur.execute(
                    "SELECT id FROM chats WHERE (user1_id = %s AND user2_id = %s) OR (user1_id = %s AND user2_id = %s)",
                    (sender_id, receiver_id, receiver_id, sender_id)
                )
                chat = cur.fetchone()
                
                if not chat:
                    cur.execute(
                        "INSERT INTO chats (user1_id, user2_id) VALUES (%s, %s) RETURNING id",
                        (sender_id, receiver_id)
                    )
                    chat = cur.fetchone()
                
                chat_id = chat['id']
                
                cur.execute(
                    "INSERT INTO messages (chat_id, sender_id, message_text, message_type, media_url) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                    (chat_id, sender_id, message_text, message_type, media_url)
                )
                message = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'success': True, 'message_id': message['id']}),
                    'isBase64Encoded': False
                }
        
        elif method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            action = params.get('action')
            
            if action == 'get_contacts':
                user_id = params.get('user_id')
                
                cur.execute(
                    """SELECT u.id, u.login, u.display_name, u.avatar_url, u.status 
                    FROM contacts c 
                    JOIN users u ON c.contact_user_id = u.id 
                    WHERE c.user_id = %s 
                    ORDER BY u.display_name""",
                    (user_id,)
                )
                contacts = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'contacts': [dict(c) for c in contacts]}),
                    'isBase64Encoded': False
                }
            
            elif action == 'get_chats':
                user_id = params.get('user_id')
                
                cur.execute(
                    """SELECT DISTINCT ON (c.id) c.id as chat_id, 
                        CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END as contact_id,
                        u.login, u.display_name, u.avatar_url, u.status,
                        m.message_text as last_message
                    FROM chats c
                    JOIN users u ON (CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END) = u.id
                    LEFT JOIN messages m ON m.chat_id = c.id
                    WHERE c.user1_id = %s OR c.user2_id = %s
                    ORDER BY c.id, m.created_at DESC""",
                    (user_id, user_id, user_id, user_id)
                )
                chats = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'chats': [dict(c) for c in chats]}),
                    'isBase64Encoded': False
                }
            
            elif action == 'get_messages':
                chat_id = params.get('chat_id')
                
                cur.execute(
                    """SELECT m.id, m.sender_id, m.message_text, m.message_type, 
                        m.media_url, m.is_read,
                        u.display_name as sender_name
                    FROM messages m
                    JOIN users u ON m.sender_id = u.id
                    WHERE m.chat_id = %s
                    ORDER BY m.created_at ASC""",
                    (chat_id,)
                )
                messages = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'messages': [dict(m) for m in messages]}),
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