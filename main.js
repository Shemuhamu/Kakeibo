class HouseholdAccount {
    //初期化、データの読み込み
    constructor() {
        this.userId = "demoUser"; // 任意のユーザーID
        this.db = firebase.firestore();
        this.data = { balance: 0, categories: [], history: [] };
    }

    //Firestoreからデータ取得
    async loadData() {
        const doc = await this.db.collection("users").doc(this.userId).get();
        if (doc.exists) {
            this.data = doc.data();
        } else {
            await this.saveData();
        }
    }

    //Firestoreにデータ保存
    async saveData() {
        await this.db.collection("users").doc(this.userId).set(this.data);
    }

    //残高設定
    async setInitialBalance(amount) {
        this.data.balance = amount;
        await this.saveData();
    }

    //カテゴリ追加
    async addCategory(category) {
        if (!this.data.categories.includes(category)) {// カテゴリが重複しないように
            this.data.categories.push(category);
            await this.saveData();
        }
    }

    //支出登録
    async addExpense(amount, category) {
        this.data.balance -= amount;
        this.data.history.push({
            date: new Date().toISOString().split('T')[0], // yyyy-mm-ddで日付を取得
            amount,
            category
        });
        await this.saveData();
    }

    //残高取得
    getBalance() {
        return this.data.balance;
    }

    //カテゴリ取得
    getCategories() {
        return this.data.categories;
    }

    //履歴取得
    getHistory() {
        return this.data.history;
    }

    //履歴削除
    async resetData() {
        this.data = { balance: 0, categories: [], history: [] };
        await this.saveData();
    }
}

// -------------------------------
// イベント接続部分
// ---------------------------

const account = new HouseholdAccount();
account.loadData().then(() => {
    updateBalance();
    updateCategoryTotals();
});

// 残金設定:入力欄から金額取得 → setInitialBalance() 呼び出し → 残金更新
document.getElementById("setBalanceBtn").addEventListener("click", async () => {
    const value = parseInt(document.getElementById("initialBalanceInput").value); // 入力値取得
    if (!isNaN(value) && value >= 0) { // 入力値が数値で、0以上の場合のみ処理
        await account.setInitialBalance(value);
        updateBalance(); //表示を更新
    }
});

// 支出登録:金額とカテゴリを入力 → addExpense() 呼び出し → 残金・カテゴリ合計更新
document.getElementById("addExpenseBtn").addEventListener("click", async () => {
    const amount = parseInt(document.getElementById("expenseAmount").value); // 入力値取得
    const category = document.getElementById("expenseCategory").value; // カテゴリ取得
    if (!isNaN(amount) && amount > 0 && category) { // 金額とカテゴリが正しい場合
        await account.addExpense(amount, category);
        updateBalance();
        updateCategoryTotals(); // カテゴリ合計更新
    }
});

// カテゴリ追加:新カテゴリ入力 → addCategory() 呼び出し → カテゴリ合計更新
document.getElementById("addCategoryBtn").addEventListener("click", async () => {
    const newCategory = document.getElementById("newCategory").value;
    if (newCategory) {
        await account.addCategory(newCategory);
        updateCategoryTotals();
    }
});

//カテゴリごとの支出
function updateCategoryTotals() {
    const categories = account.getCategories(); //getCategories()でカテゴリ取得
    const history = account.getHistory(); //getHistory()で履歴取得

    // カテゴリごとの合計を計算
    const totals = {};
    categories.forEach(cat => totals[cat] = 0);
    history.forEach(entry => {
        if (totals.hasOwnProperty(entry.category)) {
            totals[entry.category] += entry.amount;
        }
    });

    //HTMLリストにカテゴリ＋合計額を表示
    const list = document.getElementById("categoryTotals");
    list.innerHTML = "";

    categories.forEach(cat => {
        const li = document.createElement("li");
        li.textContent = `${cat}: ${totals[cat]} 円 `;

        // --- 名前変更ボタン ---
        const renameBtn = document.createElement("button");
        renameBtn.textContent = "名前変更";
        renameBtn.style.marginLeft = "10px";
        renameBtn.addEventListener("click", async () => {
            const newName = prompt("新しいカテゴリ名を入力してください：", cat);
            if (newName && newName !== cat && !categories.includes(newName)) {
                const index = account.data.categories.indexOf(cat);
                if (index !== -1) account.data.categories[index] = newName;
                account.data.history.forEach(entry => {
                    if (entry.category === cat) entry.category = newName;
                });
                await account.saveData();
                updateCategoryTotals();
            }
        });

        // --- 削除ボタン ---
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "削除";
        deleteBtn.style.marginLeft = "5px";
        deleteBtn.addEventListener("click", async () => {
            if (confirm(`カテゴリ「${cat}」を削除しますか？（履歴も削除されます）`)) {
                account.data.categories = account.data.categories.filter(c => c !== cat);
                account.data.history = account.data.history.filter(entry => entry.category !== cat);
                await account.saveData();
                updateCategoryTotals();
                document.getElementById("historyList").innerHTML = "";
            }
        });

        // ボタン追加
        li.appendChild(renameBtn);
        li.appendChild(deleteBtn);
        list.appendChild(li);
    });
}

// 履歴表示:getHistory()で履歴取得 → 日時・カテゴリ・金額を一覧表示
document.getElementById("showHistoryBtn").addEventListener("click", () => {
    const history = account.getHistory();
    const list = document.getElementById("historyList");
    list.innerHTML = ""; // 初期化
    history.forEach(entry => {
        const li = document.createElement("li");
        li.textContent = `${entry.date} - ${entry.category}: ${entry.amount}円`;
        list.appendChild(li);
    });
});

//データリセット:confirm()で確認 → resetData()でデータ初期化 → 画面更新
document.getElementById("resetDataBtn").addEventListener("click", async () => {
    if (confirm("本当に全データをリセットしますか？")) {
        await account.resetData();
        updateBalance();
        updateCategoryTotals();
        document.getElementById("historyList").innerHTML = "";
    }
});

// 残高表示
function updateBalance() {
    document.getElementById("balance").textContent = account.getBalance();
}
