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
      // Fetch tags from backend API
      const response = await $fetch(`${apiBase}/tags`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      })

      return response
    }

    if (method === 'POST') {
      // Check if this is a subscribe endpoint
      const endpoint = event.context.params?._
      
      if (endpoint?.includes('/subscribe')) {
        const tagId = endpoint.split('/')[0]
        
        if (!tagId) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Tag ID parameter is required'
          })
        }

        const response = await $fetch(`${apiBase}/tags/${tagId}/subscribe`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        })

        return response
      }

      // Create a new tag
      const body = await readBody(event)
      
      const response = await $fetch(`${apiBase}/tags`, {
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
      // Update a tag
      const tagId = event.context.params?._
      
      if (!tagId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Tag ID parameter is required'
        })
      }

      const body = await readBody(event)
      
      const response = await $fetch(`${apiBase}/tags/${tagId}`, {
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
      // Delete a tag by ID
      const tagId = event.context.params?._
      
      if (!tagId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Tag ID parameter is required'
        })
      }

      const response = await $fetch(`${apiBase}/tags/${tagId}`, {
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
    console.error('Error in tags API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal Server Error'
    })
  }
})
