document.addEventListener('DOMContentLoaded', function() {
  const siteList = document.getElementById('site-list');
  const noSitesMessage = document.getElementById('no-sites-message');
  const newSiteInput = document.getElementById('new-site');
  const addSiteBtn = document.getElementById('add-site-btn');
  const statusText = document.getElementById('status');
  
  // Load saved blocked sites
  function loadBlockedSites() {
    chrome.storage.sync.get({blockedSites: []}, function(data) {
      const blockedSites = data.blockedSites;
      
      // Clear current list
      siteList.innerHTML = '';
      
      // Show/hide no sites message
      if (blockedSites.length === 0) {
        noSitesMessage.style.display = 'block';
      } else {
        noSitesMessage.style.display = 'none';
        
        // Add each site to the list
        blockedSites.forEach(function(site) {
          const listItem = document.createElement('li');
          listItem.className = 'site-item';
          
          const siteText = document.createElement('span');
          siteText.textContent = site;
          
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'delete-btn';
          deleteBtn.textContent = 'Remove';
          deleteBtn.addEventListener('click', function() {
            removeSite(site);
          });
          
          listItem.appendChild(siteText);
          listItem.appendChild(deleteBtn);
          siteList.appendChild(listItem);
        });
      }
    });
  }
  
  // Remove a site from the blocked list
  function removeSite(site) {
    chrome.storage.sync.get({blockedSites: []}, function(data) {
      let blockedSites = data.blockedSites;
      
      // Remove the site
      blockedSites = blockedSites.filter(s => s !== site);
      
      // Save updated list
      chrome.storage.sync.set({blockedSites: blockedSites}, function() {
        showStatus('Site removed');
        loadBlockedSites();
      });
    });
  }
  
  // Add a new site to the blocked list
  function addSite(site) {
    // Basic validation - make sure it's not empty
    site = site.trim().toLowerCase();
    
    if (!site) {
      showStatus('Please enter a valid site', 'red');
      return;
    }
    
    // Remove http://, https://, and www. prefixes if present
    site = site.replace(/^https?:\/\//, '').replace(/^www\./, '');
    
    chrome.storage.sync.get({blockedSites: []}, function(data) {
      let blockedSites = data.blockedSites;
      
      // Check if site already exists in the list
      if (blockedSites.includes(site)) {
        showStatus('Site already in list', 'red');
        return;
      }
      
      // Add the site
      blockedSites.push(site);
      
      // Save updated list
      chrome.storage.sync.set({blockedSites: blockedSites}, function() {
        showStatus('Site added');
        newSiteInput.value = '';
        loadBlockedSites();
      });
    });
  }
  
  // Show status message
  function showStatus(message, color = 'green') {
    statusText.textContent = message;
    statusText.style.color = color;
    statusText.style.display = 'block';
    
    setTimeout(function() {
      statusText.style.display = 'none';
    }, 1500);
  }
  
  // Add site button click handler
  addSiteBtn.addEventListener('click', function() {
    addSite(newSiteInput.value);
  });
  
  // Enter key in input field
  newSiteInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addSite(newSiteInput.value);
    }
  });
  
  // Load blocked sites on page load
  loadBlockedSites();
}); 