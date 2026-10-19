// ✅ आपकी गूगल शीट की सही ID यहाँ सेट कर दी गई है
const SHEET_ID = '1v06TReMUN_KHEbi9yaZnC1WE1Cks1-O6ORdRtLcfs68'; 

let selectedSubject = 'BLIS';
let currentQuestionIndex = 0;
let totalQuestionsCount = 0;
let timerInterval;
let timeLeft = 6000; // 100 मिनट
let examStarted = false;
let questions = [];

function updateSelectedSubject() {
    selectedSubject = document.getElementById('subject-select').value;
    document.getElementById('current-topic-display').innerText = `विषय: ${selectedSubject}`;
}

function startExamWithSubject() {
    selectedSubject = document.getElementById('subject-select').value;
    document.getElementById('current-topic-display').innerText = `विषय: ${selectedSubject}`;
    
    const loadingElem = document.getElementById('loading-spinner');
    const startBtn = document.getElementById('start-exam-btn');
    
    loadingElem.style.display = 'block';
    startBtn.disabled = true;

    const oldScript = document.getElementById('sheet-jsonp-script');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'sheet-jsonp-script';
    
    // JSONP सुरक्षा बायपास लिंक
    script.src = `https://google.com{SHEET_ID}/gviz/tq?tqx=responseHandler:handleSheetData&sheet=${encodeURIComponent(selectedSubject)}`;
    
    script.onerror = function() {
        alert(`त्रुटि: "${selectedSubject}" लोड नहीं हो सकी। कृपया इंटरनेट जांचें और सुनिश्चित करें कि Google Sheet में Share सेटिंग्स 'Anyone with the link' पर सेट है।`);
        loadingElem.style.display = 'none';
        startBtn.disabled = false;
    };

    document.body.appendChild(script);
}

// गूगल शीट से डेटा आने पर उसे प्रोसेस करने वाला सही फंक्शन
function handleSheetData(jsonData) {
    const loadingElem = document.getElementById('loading-spinner');
    const startBtn = document.getElementById('start-exam-btn');

    try {
        const rows = jsonData.table.rows;
        questions = [];

        rows.forEach((row, idx) => {
            // पहली लाइन हेडर (SetNum, QuestionText...) होती है, इसे छोड़ दें
            if (idx === 0) return; 
            if (!row || !row.c || row.c[1] == null) return; 

            // आपकी शीट के अनुसार कॉलम मैपिंग (A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7)
            let qText = row.c[1] ? row.c[1].v : '';
            let optA = row.c[2] ? row.c[2].v : '';
            let optB = row.c[3] ? row.c[3].v : '';
            let optC = row.c[4] ? row.c[4].v : '';
            let optD = row.c[5] ? row.c[5].v : '';
            let correctLetter = row.c[6] ? row.c[6].v.toString().trim().toUpperCase() : 'A';
            
            // यदि आपने H कॉलम में व्याख्या लिखी है तो आएगी, अन्यथा डिफ़ॉल्ट संदेश दिखेगा
            let expText = row.c[7] ? row.c[7].v : 'इस प्रश्न के लिए कोई आधिकारिक व्याख्या उपलब्ध नहीं है।';

            let correctIdx = 0;
            if (correctLetter === 'B') correctIdx = 1;
            if (correctLetter === 'C') correctIdx = 2;
            if (correctLetter === 'D') correctIdx = 3;

            questions.push({
                id: questions.length,
                number: questions.length + 1,
                text: qText,
                options: [optA, optB, optC, optD],
                correctIndex: correctIdx,
                userAnswer: null,
                isReviewed: false,
                explanation: expText
            });
        });

        totalQuestionsCount = questions.length;

        if (totalQuestionsCount === 0) {
            alert(`टैब "${selectedSubject}" में कोई प्रश्न नहीं मिला। कृपया जांचें कि डेटा सही रो से शुरू है या नहीं।`);
            loadingElem.style.display = 'none';
            startBtn.disabled = false;
            return;
        }

        examStarted = true;
        loadingElem.style.display = 'none';
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('exam-nav-buttons').style.display = 'flex';
        document.getElementById('active-set-title').innerText = `एक्टिव विषय: ${selectedSubject}`;
        document.getElementById('total-questions').innerText = totalQuestionsCount;

        buildPalette();
        loadQuestion(0);
        startTimer();

    } catch (error) {
        console.error("प्रसंस्करण त्रुटि:", error);
        alert("डेटा फॉर्मेट पढ़ने में समस्या हुई। कृपया गूगल शीट की संरचना जांचें।");
        loadingElem.style.display = 'none';
        startBtn.disabled = false;
    }
}

function buildPalette() {
    const paletteContainer = document.getElementById('question-palette');
    paletteContainer.innerHTML = '';
    questions.forEach((q, idx) => {
        const btn = document.createElement('button');
        btn.className = 'palette-btn';
        btn.id = `palette-btn-${idx}`;
        btn.innerText = q.number;
        btn.onclick = () => loadQuestion(idx);
        paletteContainer.appendChild(btn);
    });
}

function loadQuestion(idx) {
    currentQuestionIndex = idx;
    const q = questions[idx];
    const container = document.getElementById('questions-container');
    
    document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('current'));
    document.getElementById(`palette-btn-${idx}`).classList.add('current');
    
    let optionsHtml = q.options.map((opt, i) => `
        <li class="${q.userAnswer === i ? 'selected' : ''}" onclick="selectOption(${i})">
            <strong>(${String.fromCharCode(65 + i)})</strong> ${opt}
        </li>
    `).join('');
    
    container.innerHTML = `
        <div class="question-block active">
            <h3>प्रश्न ${q.number}:</h3>
            <p>${q.text}</p>
            <ul class="options-list">${optionsHtml}</ul>
        </div>
    `;
    updateStats();
}

function selectOption(optIndex) {
    const q = questions[currentQuestionIndex];
    q.userAnswer = optIndex;
    
    document.querySelectorAll('.options-list li').forEach((li, i) => {
        if (i === optIndex) li.classList.add('selected');
        else li.classList.remove('selected');
    });
    
    document.getElementById(`palette-btn-${currentQuestionIndex}`).classList.add('answered');
    updateStats();
}

function markForReview() {
    const q = questions[currentQuestionIndex];
    q.isReviewed = !q.isReviewed;
    const paletteBtn = document.getElementById(`palette-btn-${currentQuestionIndex}`);
    if (q.isReviewed) paletteBtn.classList.add('reviewed');
    else paletteBtn.classList.remove('reviewed');
    updateStats();
}

function changeQuestion(dir) {
    let nextIdx = currentQuestionIndex + dir;
    if (nextIdx >= 0 && nextIdx < totalQuestionsCount) {
        loadQuestion(nextIdx);
    }
}

function updateStats() {
    let answered = questions.filter(q => q.userAnswer !== null).length;
    let reviewed = questions.filter(q => q.isReviewed).length;
    document.getElementById('total-answered').innerText = answered;
    document.getElementById('total-reviewed').innerText = reviewed;
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        let min = Math.floor(timeLeft / 60);
        let sec = timeLeft % 60;
        document.getElementById('time-display').innerText = 
            `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitExam();
        }
    }, 1000);
}

function submitExam() {
    if (!examStarted) return;
    clearInterval(timerInterval);
    let correct = 0;
    let wrong = 0;
    
    questions.forEach(q => {
        if (q.userAnswer !== null) {
            if (q.userAnswer === q.correctIndex) correct++;
            else wrong++;
        }
    });
    
    let percent = ((correct / totalQuestionsCount) * 100).toFixed(1);
    
    document.getElementById('correct-count').innerText = correct;
    document.getElementById('wrong-count').innerText = wrong;
    document.getElementById('percentage-score').innerText = `${percent}%`;
    document.getElementById('final-result-box').style.display = 'block';
    
    generateReviewPanel();
    
    alert(`परीक्षा समाप्त! आपका स्कोर: ${percent}%। विस्तृत उत्तर कुंजी नीचे देखें।`);
}

function generateReviewPanel() {
    const reviewListContainer = document.getElementById('review-questions-list');
    reviewListContainer.innerHTML = '';
    
    questions.forEach((q) => {
        const isCorrect = q.userAnswer === q.correctIndex;
        const cardClass = q.userAnswer === null ? 'review-card' : (isCorrect ? 'review-card correct-card' : 'review-card wrong-card');
        
        let statusText = q.userAnswer === null ? "⚪ आपने इस प्रश्न का उत्तर नहीं दिया।" : (isCorrect ? "🟢 आपका उत्तर सही है।" : "🔴 आपका उत्तर गलत है।");

        let optionsHtml = q.options.map((opt, i) => {
            let cssClass = "review-opt";
            if (i === q.correctIndex) cssClass += " correct";
            if (q.userAnswer === i && !isCorrect) cssClass += " wrong";
            return `<div class="${cssClass}">(${String.fromCharCode(65 + i)}) ${opt}</div>`;
        }).join('');

        const card = document.createElement('div');
        card.className = cardClass;
        card.innerHTML = `
            <h4>प्रश्न ${q.number}: ${q.text}</h4>
            <div class="user-ans-info">${statusText}</div>
            <div style="margin-left: 15px;">${optionsHtml}</div>
            <div class="explanation-box">
                <strong>💡 व्याख्या (Explanation):</strong> ${q.explanation}
            </div>
        `;
        reviewListContainer.appendChild(card);
    });
    
    document.getElementById('review-section').style.display = 'block';
    document.getElementById('review-section').scrollIntoView({ behavior: 'smooth' });
}

function logoutToWelcome() {
    if (confirm("क्या आप वाकई टेस्ट छोड़कर वापस जाना चाहते हैं?")) {
        location.reload();
    }
}
