
with open(r'c:\Users\user\Documents\newproject\backend\api\repositories\metrics_repository.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i in range(720, 735):
        print(f"{i+1}: {repr(lines[i])}")
