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
      console.log('[Server Proxy] Fetching users from:', `${apiBase}/users`)
      console.log('[Server Proxy] Auth header present:', !!authHeader)
      
      const response = await $fetch(`${apiBase}/users`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      })

      console.log('[Server Proxy] Users fetched successfully, count:', Array.isArray(response) ? response.length : 'unknown')
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

    if (method === 'PUT') {
      // Update user role or user data
      const userId = event.context.params?._?.split('/')[0]
      const endpoint = event.context.params?._
      
      if (!userId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'User ID parameter is required'
        })
      }

      // Check if this is an activate/deactivate endpoint (EP25)
      if (endpoint?.includes('/activate') || endpoint?.includes('/deactivate')) {
        const action = endpoint?.includes('/activate') ? 'activate' : 'deactivate'
        
        const response = await $fetch(`${apiBase}/users/${userId}/${action}`, {
          method: 'PUT',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        })

        return response
      }

      // Check if this is a role update endpoint
      if (endpoint?.endsWith('/role')) {
        const body = await readBody(event)
        
        const response = await $fetch(`${apiBase}/users/${userId}/role`, {
          method: 'PUT',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })

        return response
      }

      // Otherwise, it's a full user data update (EP23)
      const body = await readBody(event)
      
      const response = await $fetch(`${apiBase}/users/${userId}`, {
        method: 'PUT',
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
    console.error('[Server Proxy] Error in users API:', {
      method,
      statusCode: error.statusCode,
      statusMessage: error.statusMessage,
      message: error.message,
      data: error.data,
      cause: error.cause
    })
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Internal Server Error',
      data: error.data
    })
  }
})
