export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  // Get the authorization header
  const authHeader = getHeader(event, 'authorization')
  
  if (!authHeader) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - No token provided'
    })
  }

  const method = event.method

  try {
    if (method === 'GET') {
      // Fetch users from backend API
      const response = await $fetch(`${apiBase}/users`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      })

      return response
    }

    if (method === 'POST') {
      // Create a new user
      const body = await readBody(event)
      
      const response = await $fetch(`${apiBase}/users`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      return response
    }

    if (method === 'DELETE') {
      // Delete a user by ID (from route params)
      const userId = event.context.params?._
      
      if (!userId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'User ID parameter is required'
        })
      }

      const response = await $fetch(`${apiBase}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader
        }
      })

      return response
    }

    // Method not allowed
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  } catch (error: any) {
    console.error('Error in users API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal Server Error'
    })
  }
})
