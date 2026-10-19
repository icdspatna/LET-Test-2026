// 🔴 अपनी गूगल शीट की ID यहाँ डालें
const SHEET_ID = 'https://docs.google.com/spreadsheets/d/1v06TReMUN_KHEbi9yaZnC1WE1Cks1-O6ORdRtLcfs68/edit?usp=sharing'; 

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

async function startExamWithSubject() {
    selectedSubject = document.getElementById('subject-select').value;
    document.getElementById('current-topic-display').innerText = `विषय: ${selectedSubject}`;
    
    const loadingElem = document.getElementById('loading-spinner');
    const startBtn = document.getElementById('start-exam-btn');
    
    loadingElem.style.display = 'block';
    startBtn.disabled = true;

    // ✅ ऑफ़लाइन फ़ाइलों के लिए सबसे सुरक्षित और अचूक CSV लिंक
    const sheetUrl = `https://google.com{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(selectedSubject)}`;

    try {
        const response = await fetch(sheetUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const csvText = await response.text();
        
        // CSV डेटा को लाइनों में तोड़ना
        const lines = csvText.split('\n');
        questions = [];
        
        // पहली लाइन हेडर होती है, इसलिए i=1 से शुरू करेंगे
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            // ककड़ी/कॉमा के आधार पर डेटा अलग करना (Split CSV)
            // यह रेगुलर एक्सप्रेशन इनवर्टेड कॉमा (Quotes) के अंदर वाले कॉमा को सुरक्षित रखता है
            const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*\$)/);
            
            if (row.length < 7) continue;
            
            let qText = row[1].replace(/"/g, '').trim();
            let optA = row[2].replace(/"/g, '').trim();
            let optB = row[3].replace(/"/g, '').trim();
            let optC = row[4].replace(/"/g, '').trim();
            let optD = row[5].replace(/"/g, '').trim();
            let correctLetter = row[6].replace(/"/g, '').trim().toUpperCase();
            let expText = row[7] ? row[7].replace(/"/g, '').trim() : 'कोई व्याख्या उपलब्ध नहीं है।';
            
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
        }
        
        totalQuestionsCount = questions.length;
        
        if (totalQuestionsCount === 0) {
            alert(`"${selectedSubject}" शीट में कोई प्रश्न नहीं मिला। कृपया जांचें।`);
            loadingElem.style.display = 'none';
            startBtn.disabled = false;
            return;
        }
        
        loadingElem.style.display = 'none';
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('exam-nav-buttons').style.display = 'flex';
        document.getElementById('active-set-title').innerText = `एक्टिव: ${selectedSubject}`;
        document.getElementById('total-questions').innerText = totalQuestionsCount;
        
        buildPalette();
        loadQuestion(0);
        startTimer();
        
    } catch (error) {
        console.error(error);
        alert(`त्रुटि: "${selectedSubject}" लोड नहीं हो सकी। कृपया सुनिश्चित करें कि कंप्यूटर में इंटरनेट चालू है और Google Sheet 'Anyone with the link' पर सेट है।`);
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
    
    alert(`परीक्षा समाप्त! कुल सही उत्तर: ${correct} / ${totalQuestionsCount}`);
}

function logoutToWelcome() {
    if (confirm("क्या आप वाकई टेस्ट छोड़कर वापस जाना चाहते हैं?")) {
        location.reload();
    }
}
