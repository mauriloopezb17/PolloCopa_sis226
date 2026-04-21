const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export async function fetchIngredients() {
  const res = await fetch(`${BASE_URL}/api/ingredients`)
  if (!res.ok) throw new Error('Failed to fetch ingredients')
  return res.json()
}

export async function toggleIngredient(id) {
  const res = await fetch(`${BASE_URL}/api/ingredients/${id}/toggle`, {
    method: 'PATCH',
  })
  if (!res.ok) throw new Error('Failed to toggle ingredient')
  return res.json()
}