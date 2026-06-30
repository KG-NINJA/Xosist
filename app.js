// X Search Launcher Core Logic

document.addEventListener('DOMContentLoaded', () => {
  // DOM要素の取得
  const fields = {
    keywords: document.getElementById('keywords'),
    exactPhrase: document.getElementById('exactPhrase'),
    fromUser: document.getElementById('fromUser'),
    excludeWords: document.getElementById('excludeWords'),
    sinceDate: document.getElementById('sinceDate'),
    untilDate: document.getElementById('untilDate'),
    minFaves: document.getElementById('minFaves'),
    lang: document.getElementById('lang'),
    hasImages: document.getElementById('hasImages'),
    hasVideos: document.getElementById('hasVideos'),
    excludeLinks: document.getElementById('excludeLinks'),
  };

  const queryPreview = document.getElementById('queryPreview');
  const btnCopy = document.getElementById('btnCopy');
  const btnReset = document.getElementById('btnReset');
  const btnSearchLive = document.getElementById('btnSearchLive');
  const btnSearchTop = document.getElementById('btnSearchTop');
  const historyList = document.getElementById('historyList');

  // クエリ生成ロジック
  function buildQuery() {
    const parts = [];

    // 1. キーワード
    const keywordsVal = fields.keywords.value.trim();
    if (keywordsVal) {
      parts.push(keywordsVal);
    }

    // 2. 完全一致フレーズ
    const exactVal = fields.exactPhrase.value.trim();
    if (exactVal) {
      parts.push(`"${exactVal}"`);
    }

    // 3. from:ユーザー
    let userVal = fields.fromUser.value.trim();
    if (userVal) {
      // @マークが最初についている場合は除去
      if (userVal.startsWith('@')) {
        userVal = userVal.substring(1);
      }
      parts.push(`from:${userVal}`);
    }

    // 4. 除外ワード
    const excludeVal = fields.excludeWords.value.trim();
    if (excludeVal) {
      // スペース区切りの除外ワードそれぞれにマイナスを付与
      const excludeWordsArray = excludeVal.split(/\s+/);
      excludeWordsArray.forEach(word => {
        if (word) {
          parts.push(`-${word}`);
        }
      });
    }

    // 5. since:日付
    const sinceVal = fields.sinceDate.value;
    if (sinceVal) {
      parts.push(`since:${sinceVal}`);
    }

    // 6. until:日付
    const untilVal = fields.untilDate.value;
    if (untilVal) {
      parts.push(`until:${untilVal}`);
    }

    // 7. min_faves
    const minFavesVal = fields.minFaves.value.trim();
    if (minFavesVal) {
      parts.push(`min_faves:${minFavesVal}`);
    }

    // 8. lang
    const langVal = fields.lang.value;
    if (langVal) {
      parts.push(`lang:${langVal}`);
    }

    // 9. フィルター群
    if (fields.hasImages.checked) {
      parts.push('filter:images');
    }
    if (fields.hasVideos.checked) {
      parts.push('filter:videos');
    }
    if (fields.excludeLinks.checked) {
      parts.push('-filter:links');
    }

    const finalQuery = parts.join(' ');
    queryPreview.value = finalQuery;
    return finalQuery;
  }

  // リアルタイム反映のイベントリスナー設定
  Object.values(fields).forEach(element => {
    if (element) {
      element.addEventListener('input', buildQuery);
      element.addEventListener('change', buildQuery);
    }
  });

  // クリップボードへコピー
  btnCopy.addEventListener('click', () => {
    const query = queryPreview.value.trim();
    if (!query) {
      alert('コピーするクエリがありません。');
      return;
    }
    navigator.clipboard.writeText(query)
      .then(() => {
        const originalText = btnCopy.textContent;
        btnCopy.textContent = 'コピー完了！';
        btnCopy.style.borderColor = 'var(--accent-teal)';
        btnCopy.style.color = 'var(--accent-teal)';
        setTimeout(() => {
          btnCopy.textContent = originalText;
          btnCopy.style.borderColor = 'var(--border-color)';
          btnCopy.style.color = 'var(--text-primary)';
        }, 1500);
      })
      .catch(err => {
        console.error('コピー失敗:', err);
        alert('コピーに失敗しました。手動でコピーしてください。');
      });
  });

  // フォームリセット
  btnReset.addEventListener('click', () => {
    Object.keys(fields).forEach(key => {
      if (fields[key].type === 'checkbox') {
        fields[key].checked = false;
      } else if (key === 'lang') {
        fields[key].value = 'ja'; // 初期値は日本語
      } else {
        fields[key].value = '';
      }
    });
    buildQuery();
  });

  // 履歴保存と再表示
  function getHistory() {
    try {
      const data = localStorage.getItem('x_search_history');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('履歴読み込み失敗:', e);
      return [];
    }
  }

  function saveHistory(query, state) {
    if (!query) return;
    let history = getHistory();

    // 既に同じクエリが存在する場合は一旦削除し、先頭（最新）に追加し直す
    history = history.filter(item => item.query !== query);

    history.unshift({
      query: query,
      state: state,
      timestamp: new Date().toLocaleString('ja-JP')
    });

    // 最大10件
    if (history.length > 10) {
      history = history.slice(0, 10);
    }

    try {
      localStorage.setItem('x_search_history', JSON.stringify(history));
    } catch (e) {
      console.error('履歴書き込み失敗:', e);
    }
    renderHistory();
  }

  function renderHistory() {
    const history = getHistory();
    historyList.innerHTML = '';

    if (history.length === 0) {
      historyList.innerHTML = '<li class="empty-message">履歴はありません</li>';
      return;
    }

    history.forEach(item => {
      const li = document.createElement('li');
      li.className = 'history-item';
      
      const queryDiv = document.createElement('div');
      queryDiv.className = 'history-item-query';
      queryDiv.textContent = item.query;
      queryDiv.title = item.query;

      const dateDiv = document.createElement('div');
      dateDiv.className = 'history-item-date';
      dateDiv.textContent = item.timestamp.split(' ')[0]; // 日付のみ簡易表示

      li.appendChild(queryDiv);
      li.appendChild(dateDiv);

      // 履歴クリックで復元
      li.addEventListener('click', () => {
        restoreState(item.state);
      });

      historyList.appendChild(li);
    });
  }

  function restoreState(state) {
    if (!state) return;
    Object.keys(fields).forEach(key => {
      if (fields[key]) {
        if (fields[key].type === 'checkbox') {
          fields[key].checked = !!state[key];
        } else {
          fields[key].value = state[key] || '';
        }
      }
    });
    buildQuery();
  }

  function captureCurrentState() {
    const state = {};
    Object.keys(fields).forEach(key => {
      if (fields[key].type === 'checkbox') {
        state[key] = fields[key].checked;
      } else {
        state[key] = fields[key].value;
      }
    });
    return state;
  }

  // 検索実行
  function launchSearch(mode) {
    const query = buildQuery();
    if (!query) {
      alert('検索クエリが空です。検索条件を入力してください。');
      return;
    }

    // 履歴に保存
    const state = captureCurrentState();
    saveHistory(query, state);

    // URL生成と遷移
    const encodedQuery = encodeURIComponent(query);
    const baseUrl = 'https://x.com/search';
    const finalUrl = `${baseUrl}?q=${encodedQuery}&src=typed_query&f=${mode}`;

    window.open(finalUrl, '_blank');
  }

  btnSearchLive.addEventListener('click', () => launchSearch('live'));
  btnSearchTop.addEventListener('click', () => launchSearch('top'));

  // 初期化時の実行
  buildQuery();
  renderHistory();
});
