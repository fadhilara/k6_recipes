import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

const BASE_URL = 'https://dummyjson.com/recipes';

// Load data from CSV
const recipes = new SharedArray('recipes', function () {
  return papaparse.parse(open('./recipes.csv'), { header: true }).data;
});

export const options = {
    scenarios: {
        // === 1. Ramping VUs Scenario ===
        ramping_phase: {
          executor: 'ramping-vus',
          startVUs: 0,
          stages: [
            { duration: '5s', target: 10 },   // up to 20 VUs
            { duration: '10s', target: 25 },    // up to 50 VUs
            { duration: '20s', target: 50 },   // up to 100 VUs
            { duration: '25s', target: 50 },   // stay at 100 VUs
            { duration: '30s', target: 0 },    // down to 0 VUs
          ],
          gracefulRampDown: '30s',
        },
    
        // === 2. Constant VUs Scenario ===
        constant_phase: {
          executor: 'constant-vus',
          vus: 50,
          duration: '15s',
          startTime: '20s',  
        },
      },
  thresholds: {
    http_req_failed: ['rate<0.1'], // the error rate must be lower than 10%
    http_req_duration: ['p(90)<25'], // 90% of requests must complete below 25ms
    http_req_receiving: ['max<55'], // slowest request below 55ms
    iteration_duration: ['p(95)<105'], // 95% of requests must complete below 105ms
   },
   cloud: {
    // Project: recipes
    projectID: 3767840,
    // Test runs with the same name groups test runs together.
    name: 'Load Recipes'
  }
};

export default function () {
  const recipe = recipes[__VU - 1]; // Satu resep per VU
  

  // === POST ===
  const postRes = http.post(`${BASE_URL}/add`, JSON.stringify(recipe), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(postRes, {
    'POST status 200': (r) => r.status === 200,
    'POST has id': (r) => JSON.parse(r.body).id !== undefined,
  });

  const created = JSON.parse(postRes.body);
  const id = created.id;

  // === GET SEARCH NAME===
  const getRes1 = http.get(`${BASE_URL}/search?q=Chicken`);
  check(getRes1, {
    'GET status 200': (r) => r.status === 200,
    'GET name chicken': (r) => {
        const json = getRes1.json();
        return Array.isArray(json.recipes) &&
          json.recipes.some(recipe =>
            typeof recipe.name === 'string' &&
            recipe.name.includes('Chicken')
          );
    }
  });

  // === GET TAG===
  const getRes2 = http.get(`${BASE_URL}/tag/Vegetarian`);
  check(getRes2, {
    'GET status 200': (r) => r.status === 200,
    'GET tag vegetarian': (r) => {
        const json = getRes2.json();
        return Array.isArray(json.recipes) &&
          json.recipes.some(recipe =>
            typeof recipe.name === 'string' &&
            recipe.tags.includes('Vegetarian')
          );
    }
  });

  // === GET MEAL TYPE===
  const getRes3 = http.get(`${BASE_URL}/meal-type/Dessert`);
  check(getRes3, {
    'GET status 200': (r) => r.status === 200,
    'GET meal type dessert': (r) => {
        const json = getRes3.json();
        return Array.isArray(json.recipes) &&
          json.recipes.some(recipe =>
            typeof recipe.name === 'string' &&
            recipe.mealType.includes('Dessert')
          );
    }
  });

  // === PUT ===
  const updatedData = {
    name: recipe.name + ' (Updated)',
  };

  const putRes = http.put(`${BASE_URL}/1`, JSON.stringify(updatedData), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(putRes, {
    'PUT status 200': (r) => r.status === 200,
    'PUT name updated': (r) => {
        const json = r.json();
      return typeof json.name === 'string' && json.name.includes('Updated');
    }
  });

  // === DELETE ===
  const delRes = http.del(`${BASE_URL}/1`, null, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(delRes, {
    'DELETE status 200': (r) => r.status === 200,
    'DELETE success': (r) => JSON.parse(r.body).isDeleted === true,
  });

  sleep(1);
}
