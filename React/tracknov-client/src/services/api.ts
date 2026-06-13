export const initializeProjectContext = async (projectPath: string, organizationId: string) => {
  try {
    const response = await fetch('http://localhost:5101/api/harita/verify-project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectPath: projectPath,
        organizationId: organizationId
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with non-200 status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error during project verification:', error);
    throw error;
  }
};

export async function evaluateCreditMetrics(creditCode: string, payload: any): Promise<any> {
  try {
    const response = await fetch('http://localhost:5101/api/harita/evaluate-credit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        creditCode,
        extractionPayload: payload
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to evaluate credit payload');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error during credit evaluation:', error);
    throw error;
  }
}

export async function sendHaritaMessage(message: string): Promise<any> {
  try {
    const response = await fetch('http://localhost:5101/api/harita/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to communicate with Harita');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error during Harita chat:', error);
    throw error;
  }
}