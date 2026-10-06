const STORAGE_KEYS = {
  recipes: 'recipe-planner-recipes',
  planner: 'recipe-planner-week'
};

const defaultRecipes = [
  {
    id: crypto.randomUUID(),
    name: 'Lemon Herb Chicken',
    time: '35 min',
    servings: 4,
    tags: ['high protein', 'family'],
    ingredients: ['2 chicken breasts', '1 lemon', '2 tbsp olive oil', '2 cloves garlic', '1 tsp dried oregano', 'Salt and pepper'],
    instructions: 'Season the chicken, roast with garlic and lemon, and serve with your preferred side.'
  },
  {
    id: crypto.randomUUID(),
    name: 'Veggie Pasta Bowl',
    time: '20 min',
    servings: 2,
    tags: ['quick', 'vegetarian'],
    ingredients: ['200g pasta', '1 zucchini', '1 bell pepper', '1 cup cherry tomatoes', '2 tbsp pesto', 'Parmesan'],
    instructions: 'Cook the pasta, saute the vegetables, toss with pesto, and finish with parmesan.'
  },
  {
    id: crypto.randomUUID(),
    name: 'Berry Yogurt Parfait',
    time: '10 min',
    servings: 1,
    tags: ['breakfast', 'light'],
    ingredients: ['1 cup Greek yogurt', '1/2 cup mixed berries', '2 tbsp granola', '1 tbsp honey'],
    instructions: 'Layer yogurt, berries, granola, and honey in a jar or bowl.'
  }
];

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const slots = ['Breakfast', 'Lunch', 'Dinner'];

const recipeForm = document.querySelector('#recipe-form');
const recipeList = document.querySelector('#recipe-list');
const recipeSearch = document.querySelector('#recipe-search');
const plannerGrid = document.querySelector('#planner-grid');
const groceryList = document.querySelector('#grocery-list');
const recipeCount = document.querySelector('#recipe-count');
const weeklyMealsCount = document.querySelector('#weekly-meals-count');
const resetDemoButton = document.querySelector('#reset-demo');
const clearPlannerButton = document.querySelector('#clear-planner');
const cancelEditButton = document.querySelector('#cancel-edit');

const formFields = {
  id: document.querySelector('#recipe-id'),
  name: document.querySelector('#recipe-name'),
  time: document.querySelector('#recipe-time'),
  servings: document.querySelector('#recipe-servings'),
  tags: document.querySelector('#recipe-tags'),
  ingredients: document.querySelector('#recipe-ingredients'),
  instructions: document.querySelector('#recipe-instructions')
};

const state = {
  recipes: loadRecipes(),
  planner: loadPlanner(),
  filter: ''
};

function loadRecipes() {
  const cached = localStorage.getItem(STORAGE_KEYS.recipes);
  if (!cached) {
    localStorage.setItem(STORAGE_KEYS.recipes, JSON.stringify(defaultRecipes));
    return structuredClone(defaultRecipes);
  }

  try {
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) && parsed.length ? parsed : structuredClone(defaultRecipes);
  } catch (error) {
    return structuredClone(defaultRecipes);
  }
}

function loadPlanner() {
  const cached = localStorage.getItem(STORAGE_KEYS.planner);
  if (!cached) {
    const emptyPlanner = {};
    dayNames.forEach((day) => {
      emptyPlanner[day] = { Breakfast: '', Lunch: '', Dinner: '' };
    });
    localStorage.setItem(STORAGE_KEYS.planner, JSON.stringify(emptyPlanner));
    return emptyPlanner;
  }

  try {
    const parsed = JSON.parse(cached);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid planner data');
    }
    dayNames.forEach((day) => {
      if (!parsed[day]) {
        parsed[day] = { Breakfast: '', Lunch: '', Dinner: '' };
      }
      slots.forEach((slot) => {
        if (parsed[day][slot] === undefined) parsed[day][slot] = '';
      });
    });
    return parsed;
  } catch (error) {
    const emptyPlanner = {};
    dayNames.forEach((day) => {
      emptyPlanner[day] = { Breakfast: '', Lunch: '', Dinner: '' };
    });
    return emptyPlanner;
  }
}

function persistRecipes() {
  localStorage.setItem(STORAGE_KEYS.recipes, JSON.stringify(state.recipes));
}

function persistPlanner() {
  localStorage.setItem(STORAGE_KEYS.planner, JSON.stringify(state.planner));
}

function getFilteredRecipes() {
  const term = state.filter.trim().toLowerCase();
  if (!term) return state.recipes;

  return state.recipes.filter((recipe) => {
    const searchable = [
      recipe.name,
      recipe.tags.join(' '),
      recipe.ingredients.join(' '),
      recipe.instructions
    ].join(' ').toLowerCase();

    return searchable.includes(term);
  });
}

function renderRecipeCount() {
  recipeCount.textContent = state.recipes.length;

  const scheduledMeals = dayNames.reduce((total, day) => {
    return total + slots.reduce((dayTotal, slot) => {
      return dayTotal + (state.planner[day]?.[slot] ? 1 : 0);
    }, 0);
  }, 0);

  weeklyMealsCount.textContent = scheduledMeals;
}

function renderRecipes() {
  const filteredRecipes = getFilteredRecipes();

  if (!filteredRecipes.length) {
    recipeList.innerHTML = '<div class="empty-state">No recipes match your search.</div>';
    return;
  }

  recipeList.innerHTML = '';

  filteredRecipes.forEach((recipe) => {
    const card = document.querySelector('#recipe-card-template').content.cloneNode(true);
    const name = card.querySelector('.recipe-name');
    const meta = card.querySelector('.recipe-meta');
    const tag = card.querySelector('.recipe-tag');
    const preview = card.querySelector('.recipe-ingredients-preview');

    name.textContent = recipe.name;
    meta.textContent = `${recipe.time} • ${recipe.servings} servings`;
    tag.textContent = recipe.tags[0] || 'recipe';
    preview.textContent = recipe.ingredients.slice(0, 4).join(' • ');

    card.querySelector('.add-to-week').addEventListener('click', () => addToPlanner(recipe.id));
    card.querySelector('.edit-recipe').addEventListener('click', () => populateForm(recipe));
    card.querySelector('.delete-recipe').addEventListener('click', () => deleteRecipe(recipe.id));

    recipeList.appendChild(card);
  });
}

function renderPlanner() {
  plannerGrid.innerHTML = '';

  dayNames.forEach((day) => {
    const dayCard = document.createElement('div');
    dayCard.className = 'planner-day';

    const heading = document.createElement('h3');
    heading.textContent = day;
    dayCard.appendChild(heading);

    const slotsContainer = document.createElement('div');
    slotsContainer.className = 'planner-slots';

    slots.forEach((slot) => {
      const slotBox = document.createElement('div');
      slotBox.className = 'planner-slot';

      const label = document.createElement('label');
      label.textContent = slot;

      const select = document.createElement('select');
      select.innerHTML = '<option value="">Unscheduled</option>' + state.recipes
        .map((recipe) => `<option value="${recipe.id}">${recipe.name}</option>`)
        .join('');

      const selectedRecipeId = state.planner[day]?.[slot] || '';
      select.value = selectedRecipeId;

      select.addEventListener('change', (event) => {
        state.planner[day][slot] = event.target.value;
        persistPlanner();
        renderPlanner();
        renderGroceryList();
        renderRecipeCount();
      });

      label.appendChild(select);
      slotBox.appendChild(label);
      slotsContainer.appendChild(slotBox);
    });

    dayCard.appendChild(slotsContainer);
    plannerGrid.appendChild(dayCard);
  });
}

function renderGroceryList() {
  const entries = new Map();

  dayNames.forEach((day) => {
    slots.forEach((slot) => {
      const recipeId = state.planner[day]?.[slot];
      if (!recipeId) return;

      const recipe = state.recipes.find((item) => item.id === recipeId);
      if (!recipe) return;

      recipe.ingredients.forEach((ingredient) => {
        const normalized = ingredient.trim();
        if (!normalized) return;

        entries.set(normalized, (entries.get(normalized) || 0) + 1);
      });
    });
  });

  if (!entries.size) {
    groceryList.innerHTML = '<li class="empty-state">Add recipes to your planner to build a grocery list.</li>';
    return;
  }

  const items = Array.from(entries.entries()).map(([ingredient, amount]) => ({
    ingredient,
    amount
  }));

  groceryList.innerHTML = items
    .map(
      ({ ingredient, amount }) => `
        <li>
          <span class="ingredient-name">${ingredient}</span>
          <span class="ingredient-qty">${amount > 1 ? `${amount}x` : '1'}</span>
        </li>
      `
    )
    .join('');
}

function populateForm(recipe) {
  formFields.id.value = recipe.id;
  formFields.name.value = recipe.name;
  formFields.time.value = recipe.time;
  formFields.servings.value = recipe.servings;
  formFields.tags.value = recipe.tags.join(', ');
  formFields.ingredients.value = recipe.ingredients.join('\n');
  formFields.instructions.value = recipe.instructions;
  document.querySelector('#submit-recipe').textContent = 'Update recipe';
  formFields.name.focus();
}

function resetForm() {
  recipeForm.reset();
  formFields.id.value = '';
  formFields.servings.value = 2;
  document.querySelector('#submit-recipe').textContent = 'Save recipe';
}

function addRecipe(event) {
  event.preventDefault();

  const payload = {
    id: formFields.id.value || crypto.randomUUID(),
    name: formFields.name.value.trim(),
    time: formFields.time.value.trim(),
    servings: Number(formFields.servings.value) || 1,
    tags: formFields.tags.value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    ingredients: formFields.ingredients.value
      .split(/\n|,/) 
      .map((ingredient) => ingredient.trim())
      .filter(Boolean),
    instructions: formFields.instructions.value.trim()
  };

  if (!payload.name || !payload.time || !payload.ingredients.length || !payload.instructions) {
    return;
  }

  const existingIndex = state.recipes.findIndex((recipe) => recipe.id === payload.id);

  if (existingIndex >= 0) {
    state.recipes[existingIndex] = payload;
  } else {
    state.recipes.unshift(payload);
  }

  persistRecipes();
  resetForm();
  renderAll();
}

function deleteRecipe(recipeId) {
  state.recipes = state.recipes.filter((recipe) => recipe.id !== recipeId);

  Object.keys(state.planner).forEach((day) => {
    slots.forEach((slot) => {
      if (state.planner[day][slot] === recipeId) {
        state.planner[day][slot] = '';
      }
    });
  });

  persistRecipes();
  persistPlanner();
  renderAll();
}

function addToPlanner(recipeId) {
  const firstOpenSlot = dayNames
    .flatMap((day) => slots.map((slot) => ({ day, slot })))
    .find(({ day, slot }) => !state.planner[day][slot]);

  if (!firstOpenSlot) {
    alert('Your week is full. Clear a slot or remove a meal to plan more recipes.');
    return;
  }

  state.planner[firstOpenSlot.day][firstOpenSlot.slot] = recipeId;
  persistPlanner();
  renderPlanner();
  renderGroceryList();
  renderRecipeCount();
}

function clearPlanner() {
  dayNames.forEach((day) => {
    state.planner[day] = { Breakfast: '', Lunch: '', Dinner: '' };
  });
  persistPlanner();
  renderPlanner();
  renderGroceryList();
  renderRecipeCount();
}

function resetDemo() {
  state.recipes = structuredClone(defaultRecipes);
  state.planner = loadPlanner();
  dayNames.forEach((day) => {
    state.planner[day] = { Breakfast: '', Lunch: '', Dinner: '' };
  });
  persistRecipes();
  persistPlanner();
  resetForm();
  renderAll();
}

function renderAll() {
  renderRecipeCount();
  renderRecipes();
  renderPlanner();
  renderGroceryList();
}

recipeForm.addEventListener('submit', addRecipe);
recipeSearch.addEventListener('input', (event) => {
  state.filter = event.target.value;
  renderRecipes();
});
clearPlannerButton.addEventListener('click', clearPlanner);
resetDemoButton.addEventListener('click', resetDemo);
cancelEditButton.addEventListener('click', resetForm);

renderAll();
