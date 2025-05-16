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
    constant_requests: {
        executor: 'constant-arrival-rate',
        rate: 10,                // 10 requests per second
        timeUnit: '1s',
        duration: '10s',          // run for 5 second
        preAllocatedVUs: 25,     // number of VUs to pre-allocate
        maxVUs: 50,              // maximum VUs to scale up if needed
      },
      ramping_requests: {
        executor: 'ramping-arrival-rate',
        startRate: 20,            // start with 20 request per detik
        timeUnit: '1s',
        preAllocatedVUs: 50,
        maxVUs: 50,
        stages: [
          { target: 40, duration: '2s' },   // up to 40 rps
          { target: 80, duration: '4s' },   // up to 80 rps
          { target: 100, duration: '8s' },   // up to 100 rps
          { target: 50, duration: '10s' },    // down to 50 rps
        ],
      },
  },
  thresholds: {
    http_req_failed: ['rate<0.1'], // the error rate must be lower than 5%
    http_req_duration: ['p(90)<300'], // 90% of requests must complete below 300ms
    http_req_receiving: ['max<35'], // slowest request below 35ms
    iteration_duration: ['p(95)<3.5'], // 95% of requests must complete below 1600ms
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
  const getRes = http.get(`${BASE_URL}/1`);
  const recipe1 = getRes.json();
  const updatedData = {
    name: recipe1.name + ' (Updated)',
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
