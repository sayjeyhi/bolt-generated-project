import { setGlobalDispatcher, ProxyAgent } from 'undici';

    // Set global dispatcher to use our proxy
    setGlobalDispatcher(new ProxyAgent('http://localhost:8888'));

    async function makeRequest() {
      try {
        const response = await fetch('https://rate.sx/btc');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.text();
        console.log('Client received status:', response.status);
        console.log('Client received body:', data);
      } catch (error) {
        console.error('Client request failed:', error);
      }
    }

    makeRequest();
