// Global variables
let allIngredients = [];
let allRecipes = [];
let selectedIngredients = [];
let allReplacements = [];

// DOM elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const ingredientInput = document.getElementById('ingredientInput');
const addIngredientBtn = document.getElementById('addIngredientBtn');
const ingredientSuggestions = document.getElementById('ingredientSuggestions');
const selectedIngredientsContainer = document.getElementById('selectedIngredients');
const suggestBtn = document.getElementById('suggestBtn');
const suggestionsList = document.getElementById('suggestionsList');
const addRecipeForm = document.getElementById('addRecipeForm');
const addReplacementForm = document.getElementById('addReplacementForm');
const recipesList = document.getElementById('recipesList');
const replacementsList = document.getElementById('replacementsList');
const loadingModal = document.getElementById('loadingModal');
const recipeModal = document.getElementById('recipeModal');
const modalRecipeName = document.getElementById('modalRecipeName');
const modalRecipeIngredients = document.getElementById('modalRecipeIngredients');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// Initialize app data
async function initializeApp() {
    try {
        showLoading();
        
        // Load all ingredients, recipes, and replacements
        const [ingredientsResponse, recipesResponse, replacementsResponse] = await Promise.all([
            fetch('/api/ingredients'),
            fetch('/api/recipes'),
            fetch('/api/replacements')
        ]);
        
        const ingredientsData = await ingredientsResponse.json();
        const recipesData = await recipesResponse.json();
        const replacementsData = await replacementsResponse.json();
        
        allIngredients = ingredientsData.ingredients || [];
        allRecipes = recipesData.recipes || [];
        allReplacements = replacementsData.replacements || [];
        
        // Load initial data for each tab
        loadRecipesList();
        loadReplacementsList();
        
        hideLoading();
    } catch (error) {
        console.error('Error initializing app:', error);
        hideLoading();
        showError('Không thể tải dữ liệu. Vui lòng thử lại.');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab navigation
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Ingredient input
    ingredientInput.addEventListener('input', handleIngredientInput);
    ingredientInput.addEventListener('keypress', handleIngredientKeyPress);
    addIngredientBtn.addEventListener('click', addIngredient);
    
    // Suggestions
    suggestBtn.addEventListener('click', suggestRecipes);
    
    // Forms
    addRecipeForm.addEventListener('submit', handleAddRecipe);
    addReplacementForm.addEventListener('submit', handleAddReplacement);
    
    // Modal
    const closeBtn = recipeModal.querySelector('.close');
    closeBtn.addEventListener('click', closeRecipeModal);
    
    window.addEventListener('click', (event) => {
        if (event.target === recipeModal) {
            closeRecipeModal();
        }
    });
}

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab panes
    tabPanes.forEach(pane => {
        pane.classList.toggle('active', pane.id === tabName);
    });
    
    // Load data for the active tab
    if (tabName === 'recipes') {
        loadRecipesList();
    } else if (tabName === 'replacements') {
        loadReplacementsList();
    }
}

// Ingredient input handling
function handleIngredientInput() {
    const value = ingredientInput.value.trim().toLowerCase();
    
    if (value.length === 0) {
        hideIngredientSuggestions();
        return;
    }
    
    const suggestions = allIngredients.filter(ingredient => 
        ingredient.toLowerCase().includes(value)
    ).slice(0, 5);
    
    showIngredientSuggestions(suggestions);
}

function handleIngredientKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addIngredient();
    }
}

function showIngredientSuggestions(suggestions) {
    ingredientSuggestions.innerHTML = '';
    
    if (suggestions.length === 0) {
        ingredientSuggestions.style.display = 'none';
        return;
    }
    
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = suggestion;
        item.addEventListener('click', () => {
            ingredientInput.value = suggestion;
            hideIngredientSuggestions();
            addIngredient();
        });
        ingredientSuggestions.appendChild(item);
    });
    
    ingredientSuggestions.style.display = 'block';
}

function hideIngredientSuggestions() {
    ingredientSuggestions.style.display = 'none';
}

function addIngredient() {
    const ingredient = ingredientInput.value.trim();
    
    if (ingredient && !selectedIngredients.includes(ingredient)) {
        selectedIngredients.push(ingredient);
        updateSelectedIngredientsDisplay();
        ingredientInput.value = '';
        hideIngredientSuggestions();
    }
}

function removeIngredient(ingredient) {
    selectedIngredients = selectedIngredients.filter(ing => ing !== ingredient);
    updateSelectedIngredientsDisplay();
}

function updateSelectedIngredientsDisplay() {
    selectedIngredientsContainer.innerHTML = '';
    
    selectedIngredients.forEach(ingredient => {
        const tag = document.createElement('div');
        tag.className = 'ingredient-tag';
        tag.innerHTML = `
            ${ingredient}
            <button class="remove-btn" onclick="removeIngredient('${ingredient}')">&times;</button>
        `;
        selectedIngredientsContainer.appendChild(tag);
    });
}

// Recipe suggestions
async function suggestRecipes() {
    if (selectedIngredients.length === 0) {
        showError('Vui lòng chọn ít nhất một nguyên liệu.');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/suggest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredients: selectedIngredients })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displaySuggestions(data.suggestions);
        } else {
            showError(data.error || 'Có lỗi xảy ra khi đề xuất món ăn.');
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error suggesting recipes:', error);
        hideLoading();
        showError('Không thể kết nối đến server. Vui lòng thử lại.');
    }
}

function getIngredientAlternatives(ingredient) {
    // Lấy tất cả các nguyên liệu thay thế cho một nguyên liệu
    const alternatives = allReplacements
        .filter(r => r.ingredient === ingredient)
        .map(r => r.alternative);
    // Đảm bảo không có lặp lại và sắp xếp
    return Array.from(new Set(alternatives)).sort();
}

function groupIngredientsWithAlternatives(ingredients) {
    // Gom nhóm các nguyên liệu có thể thay thế
    const grouped = [];
    const used = new Set();
    ingredients.forEach(ing => {
        if (used.has(ing)) return;
        const alternatives = getIngredientAlternatives(ing).filter(alt => ingredients.includes(alt));
        if (alternatives.length > 0) {
            grouped.push([ing, ...alternatives].sort());
            [ing, ...alternatives].forEach(i => used.add(i));
        } else {
            grouped.push([ing]);
            used.add(ing);
        }
    });
    return grouped;
}

function displaySuggestions(suggestions) {
    suggestionsList.innerHTML = '';
    if (suggestions.length === 0) {
        suggestionsList.innerHTML = `
            <div class="suggestion-card">
                <h3>Không tìm thấy món ăn phù hợp</h3>
                <p>Vui lòng thử với các nguyên liệu khác hoặc thêm món ăn mới vào hệ thống.</p>
            </div>
        `;
        return;
    }
    // Gom nhóm các tổ hợp nguyên liệu của cùng một món ăn
    const recipeMap = {};
    suggestions.forEach(s => {
        if (!recipeMap[s.recipe]) {
            recipeMap[s.recipe] = [];
        }
        recipeMap[s.recipe].push(s.usedIngredients);
    });
    Object.entries(recipeMap).forEach(async ([recipe, usedIngredientsList]) => {
        // Lấy nguyên liệu gốc của món ăn
        let recipeOriginalIngredients = [];
        try {
            const responseRecipe = await fetch(`/api/recipe/${encodeURIComponent(recipe)}/usage`);
            const dataRecipe = await responseRecipe.json();
            if (responseRecipe.ok) {
                recipeOriginalIngredients = dataRecipe.usageInfo.map(item => item.required);
            }
        } catch (e) {}
        // Gom nhóm từng nguyên liệu gốc theo đúng vị trí
        const ingredientGroups = recipeOriginalIngredients.map((orig, idx) => {
            const values = usedIngredientsList.map(arr => arr[idx]).filter(Boolean);
            const unique = Array.from(new Set(values));
            return unique;
        });
        // Tạo đoạn text: nếu có nhiều giá trị thì gộp bằng '/', còn không thì chỉ ghi một giá trị
        const ingredientStr = ingredientGroups.map(group => group.length > 1 ? group.join('/') : group[0]).join(', ');
        const card = document.createElement('div');
        card.className = 'suggestion-card';
        card.innerHTML = `
            <h3>${recipe}</h3>
            <p style="font-size:1.05rem;color:#333;margin-top:8px;">${ingredientStr}</p>
        `;
        card.addEventListener('click', () => showRecipeDetails(recipe, usedIngredientsList));
        suggestionsList.appendChild(card);
    });
}

// Recipe details modal
async function showRecipeDetails(recipeName, usedIngredients = null) {
    try {
        showLoading();
        let recipeOriginalIngredients = [];
        // Lấy nguyên liệu gốc của món ăn
        const responseRecipe = await fetch(`/api/recipe/${encodeURIComponent(recipeName)}/usage`);
        const dataRecipe = await responseRecipe.json();
        if (responseRecipe.ok) {
            recipeOriginalIngredients = dataRecipe.usageInfo.map(item => item.required);
        }
        modalRecipeName.textContent = recipeName;
        modalRecipeIngredients.innerHTML = '';
        const title = document.createElement('h4');
        modalRecipeIngredients.appendChild(title);
        const list = document.createElement('div');
        list.className = 'ingredient-list';
        if (Array.isArray(usedIngredients) && Array.isArray(usedIngredients[0])) {
            // Đề xuất món ăn: gom nhóm từng vị trí
            const ingredientGroups = recipeOriginalIngredients.map((orig, idx) => {
                const usedSet = new Set(usedIngredients.map(arr => arr[idx]).filter(Boolean));
                return Array.from(usedSet);
            });
            ingredientGroups.forEach(group => {
                const span = document.createElement('span');
                span.className = 'ingredient-tag';
                span.style.background = '#667eea';
                span.textContent = group.length > 1 ? group.join('/') : group[0];
                list.appendChild(span);
            });
        } else {
            // Quản lý món ăn: chỉ hiện nguyên liệu gốc
            recipeOriginalIngredients.forEach(ing => {
                const span = document.createElement('span');
                span.className = 'ingredient-tag';
                span.style.background = '#667eea';
                span.textContent = ing;
                list.appendChild(span);
            });
        }
        modalRecipeIngredients.appendChild(list);
        recipeModal.style.display = 'block';
        hideLoading();
    } catch (error) {
        console.error('Error loading recipe details:', error);
        hideLoading();
        showError('Không thể tải thông tin món ăn.');
    }
}

function closeRecipeModal() {
    recipeModal.style.display = 'none';
}

// Add new recipe
async function handleAddRecipe(event) {
    event.preventDefault();
    
    const name = document.getElementById('recipeName').value.trim();
    const ingredientsText = document.getElementById('recipeIngredients').value.trim();
    
    if (!name || !ingredientsText) {
        showError('Vui lòng điền đầy đủ thông tin.');
        return;
    }
    
    const ingredients = ingredientsText.split(',').map(ing => ing.trim()).filter(ing => ing);
    
    try {
        showLoading();
        
        const response = await fetch('/api/recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, ingredients })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Thêm món ăn thành công!');
            addRecipeForm.reset();
            
            // Refresh data
            const recipesResponse = await fetch('/api/recipes');
            const recipesData = await recipesResponse.json();
            allRecipes = recipesData.recipes || [];
            loadRecipesList();
        } else {
            showError(data.error || 'Có lỗi xảy ra khi thêm món ăn.');
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error adding recipe:', error);
        hideLoading();
        showError('Không thể kết nối đến server. Vui lòng thử lại.');
    }
}

// Add new replacement
async function handleAddReplacement(event) {
    event.preventDefault();
    
    const ingredient = document.getElementById('originalIngredient').value.trim();
    const alternative = document.getElementById('alternativeIngredient').value.trim();
    
    if (!ingredient || !alternative) {
        showError('Vui lòng điền đầy đủ thông tin.');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/replacement', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredient, alternative })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Thêm nguyên liệu thay thế thành công!');
            addReplacementForm.reset();
            loadReplacementsList();
        } else {
            showError(data.error || 'Có lỗi xảy ra khi thêm nguyên liệu thay thế.');
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error adding replacement:', error);
        hideLoading();
        showError('Không thể kết nối đến server. Vui lòng thử lại.');
    }
}

// Load recipes list
async function loadRecipesList() {
    try {
        const response = await fetch('/api/recipes');
        const data = await response.json();
        
        if (response.ok) {
            displayRecipesList(data.recipes || []);
        }
    } catch (error) {
        console.error('Error loading recipes list:', error);
    }
}

function displayRecipesList(recipes) {
    recipesList.innerHTML = '';
    recipes.forEach(recipe => {
        const item = document.createElement('div');
        item.className = 'recipe-item';
        item.innerHTML = `
            <h4>${recipe}</h4>
            <p>Nhấp để xem chi tiết nguyên liệu</p>
        `;
        item.addEventListener('click', () => showRecipeDetails(recipe));
        recipesList.appendChild(item);
    });
}

// Load replacements list
async function loadReplacementsList() {
    try {
        const response = await fetch('/api/replacements');
        const data = await response.json();
        
        if (response.ok) {
            displayReplacementsList(data.replacements || []);
        }
    } catch (error) {
        console.error('Error loading replacements list:', error);
    }
}

function displayReplacementsList(replacements) {
    replacementsList.innerHTML = '';
    
    if (replacements.length === 0) {
        replacementsList.innerHTML = `
            <div class="replacement-item">
                <h4>Chưa có nguyên liệu thay thế nào</h4>
                <p>Hãy thêm nguyên liệu thay thế mới</p>
            </div>
        `;
        return;
    }
    
    replacements.forEach(replacement => {
        const item = document.createElement('div');
        item.className = 'replacement-item';
        item.innerHTML = `
            <h4>${replacement.ingredient}</h4>
            <p>Có thể thay thế bằng: ${replacement.alternative}</p>
        `;
        replacementsList.appendChild(item);
    });
}

// Utility functions
function showLoading() {
    loadingModal.style.display = 'block';
}

function hideLoading() {
    loadingModal.style.display = 'none';
}

function showError(message) {
    alert('Lỗi: ' + message);
}

function showSuccess(message) {
    alert('Thành công: ' + message);
}

// Click outside suggestions to hide them
document.addEventListener('click', (event) => {
    if (!ingredientInput.contains(event.target) && !ingredientSuggestions.contains(event.target)) {
        hideIngredientSuggestions();
    }
}); 