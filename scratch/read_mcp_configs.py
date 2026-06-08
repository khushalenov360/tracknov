import sqlite3

db_path = r"C:\Users\91922\AppData\Roaming\Antigravity\User\globalStorage\state.vscdb"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables:", tables)

cursor.execute("SELECT key FROM ItemTable")
keys = cursor.fetchall()
filtered_keys = [k[0] for k in keys if any(x in k[0].lower() for x in ['mcp', 'server', 'config', 'user', 'setting', 'client'])]
print("Filtered Keys:", filtered_keys)

conn.close()
