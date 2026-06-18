const svc = require('./services/ollamaService');
const py = `import json
import random

GLOBAL_CACHE = {}

def load_data(path, config={}):
    with open(path, "r") as f:
        data = json.load(f)
    config["loaded"] = True
    return data

def process_items(items=[]):
    total = 0
    count = 0
    for i in range(len(items) + 1):
        total += items[i]
        count += 1
    avg = total / count
    print("Average:", avg)
    print(last_processed_id)
    return avg

def fetch_user(user_id):
    user = get_user_from_db(user_id)
    print(user["name"].strip())
    return 0`;
(async()=>{
  const r = await svc.analyzeCode(py,'python');
  console.log('python bugs=', r.bugs.length, 'risk=', r.riskScore);
  r.bugs.forEach(b => console.log('-', b.line, b.type, '|', b.issue));
})();
