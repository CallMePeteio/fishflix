



const VIDEO_CONTAINER = document.getElementById("video-container");

let currentVideoStreams = {}

const makeVideoString = (name) => {
  const VIDEO_STRING ='<video id="my-video" class="video-js" controls preload="auto" width="640" height="264" data-setup="{}">' + 
    '<source src="/hls/' + name + '.m3u8" type="application/x-mpegURL">' + 
  '</video>';

  return VIDEO_STRING;

}


async function fetchLiveStreams(token) {
  try {
    const headers = {'Authorization': `Bearer ${token}`};
    // Making a GET request to the specified URL
    const response = await fetch('https://ip.duerfyringsvakt.com:8443/api/livestreams', { headers });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    // Parsing the JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error);
    
  }
}

async function getToken() {
  
  const token = localStorage.getItem("token");

  if(!token){
    window.location.href = "/login?message=" + encodeURIComponent("You need to login to acces this page!");
    return null;
  }
  return token
}


const updateLiveStreams = async () => {
  token = await getToken();

  if (token != null){
    const videoStreams = await fetchLiveStreams(token);

    console.log(videoStreams);

    if (currentVideoStreams.length != videoStreams.length){
      console.log(videoStreams)
      let htmlString = "";
      for(let stream of videoStreams){
        htmlString += makeVideoString(stream["username"]);
        console.log(htmlString);
      };
      VIDEO_CONTAINER.innerHTML = htmlString;
      currentVideoStreams = videoStreams;
  
  
      
      const videos = document.querySelectorAll('.video-js');
      videos.forEach(video => {
        videojs(video, {autoplay: true, muted: true});
      });
    }




  }else {
    return;
  }

}



// Call the function
console.log(updateLiveStreams());
setInterval(updateLiveStreams, 10000)
