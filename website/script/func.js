

export async function postData(url = '', data = {}) {
    try {
        // Default options are marked with *
        const response = await fetch(url, {
          method: 'POST', // *GET, POST, PUT, DELETE, etc.
          mode: 'cors', // no-cors, *cors, same-origin  
          cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
          credentials: 'same-origin', // include, *same-origin, omit
          headers: {
            'Content-Type': 'application/json'
            // 'Content-Type': 'application/x-www-form-urlencoded',
          },
          redirect: 'follow', // manual, *follow, error
          referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
          body: JSON.stringify(data) // body data type must match "Content-Type" header
        });
        return response.json(); // parses JSON response into native JavaScript objects
    } catch (error) {
        console.error("Error handeling the post request");
    }
  }
  

export async function getDataJSW(url = '', token = '') {
  try {
      // Default options for a GET request
      const response = await fetch(url, {
          method: 'GET', // The method is GET for fetching data
          mode: 'cors', // Assuming CORS is required; adjust as needed
          cache: 'no-cache', // Cache policy
          credentials: 'same-origin', // Include cookies for the same domain
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` // Include the JWT in Authorization header
          },
          redirect: 'follow', // Follow redirects
          referrerPolicy: 'no-referrer', // No referrer policy
      });
      // Check if the response was ok (status in the range 200-299)
      if (!response.ok) {
          throw new Error('Network response was not ok');
      }
      return response.json(); // Parse and return the response JSON data
  } catch (error) {
      console.error("Error handling the GET request:", error);
      throw error; // Rethrow to let the caller handle it
  }
}


export async function postDataJWT(url = '', data = {}, token = '') {
  try {
    // Options for a POST request with JSON body
    const response = await fetch(url, {
        method: 'POST', // Method is now POST
        mode: 'cors', // Assuming CORS is required; adjust as needed
        cache: 'no-cache', // Cache policy
        credentials: 'same-origin', // Include cookies for the same domain
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Include the JWT in Authorization header
        },
        redirect: 'follow', // Follow redirects
        referrerPolicy: 'no-referrer', // No referrer policy
        body: JSON.stringify(data) // Convert data object to JSON string
    });
    // Check if the response was ok (status in the range 200-299)
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json(); // Parse and return the response JSON data
  } catch (error) {
      console.error("Error handling the POST request:", error);
      throw error; // Rethrow to let the caller handle it
  }
}


