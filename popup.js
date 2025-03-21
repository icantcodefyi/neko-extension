document.addEventListener('DOMContentLoaded', function() {
  const enableToggle = document.getElementById('enableOnCurrentSite');
  const saveButton = document.getElementById('saveButton');
  const statusText = document.getElementById('status');
  const toggleManageButton = document.getElementById('toggleManage');
  const manageSitesSection = document.getElementById('manageSites');
  const siteList = document.getElementById('site-list');
  const siteListContainer = document.querySelector('.site-list-container');
  const noSitesMessage = document.getElementById('no-sites-message');
  const newSiteInput = document.getElementById('new-site');
  const addSiteButton = document.getElementById('add-site-btn');
  const catThemeSelect = document.getElementById('catThemeSelect');
  const catPreview = document.getElementById('catPreview');

  // Function to update cat preview
  function updateCatPreview(theme) {
    catPreview.src = `cats/${theme}.gif`;
  }

  // Load current cat theme
  chrome.storage.sync.get(['catTheme'], function(result) {
    const theme = result.catTheme || 'oneko';
    catThemeSelect.value = theme;
    updateCatPreview(theme);
  });

  // Handle cat theme changes - only update preview
  catThemeSelect.addEventListener('change', function() {
    const selectedTheme = catThemeSelect.value;
    updateCatPreview(selectedTheme);
  });

  // Update scroll indicators when the list scrolls
  function updateScrollIndicators() {
    if (!siteListContainer) return;
    
    const canScrollUp = siteList.scrollTop > 0;
    const canScrollDown = siteList.scrollTop < (siteList.scrollHeight - siteList.clientHeight);
    
    siteListContainer.classList.toggle('can-scroll-up', canScrollUp);
    siteListContainer.classList.toggle('can-scroll-down', canScrollDown);
  }

  // Add scroll event listener to the sites list
  siteList.addEventListener('scroll', updateScrollIndicators);

  // Helper function to normalize domain
  function normalizeDomain(domain) {
    domain = domain.toLowerCase().trim();
    // Remove protocol and path
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
    domain = domain.split('/')[0];
    return domain;
  }

  // Helper function to get domain variations
  function getDomainVariations(domain) {
    const normalizedDomain = normalizeDomain(domain);
    return [normalizedDomain, `www.${normalizedDomain}`];
  }

  // Helper function to get display domain
  function getDisplayDomain(domain) {
    return normalizeDomain(domain);
  }

  // Helper function to check if domain is blocked (including variations)
  function isDomainBlocked(domain, blockedSites) {
    const variations = getDomainVariations(domain);
    return variations.some(variation => blockedSites.includes(variation));
  }

  // Load current site settings
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = new URL(tabs[0].url);
    const hostname = currentUrl.hostname;
    
    chrome.storage.sync.get(['blockedSites'], function(result) {
      const blockedSites = result.blockedSites || [];
      enableToggle.checked = !isDomainBlocked(hostname, blockedSites);
    });
  });

  // Toggle manage sites section
  toggleManageButton.addEventListener('click', function() {
    const isHidden = manageSitesSection.classList.contains('hidden');
    manageSitesSection.classList.toggle('hidden');
    toggleManageButton.textContent = isHidden ? 'Hide blocked sites' : 'Manage blocked sites';
    
    if (!isHidden) return; // Only load sites when opening
    
    // Load and display blocked sites
    chrome.storage.sync.get(['blockedSites'], function(result) {
      const blockedSites = result.blockedSites || [];
      updateSitesList(blockedSites);
    });
  });

  // Save current site setting and theme
  saveButton.addEventListener('click', function() {
    const selectedTheme = catThemeSelect.value;
    
    // Save theme
    chrome.storage.sync.set({ catTheme: selectedTheme });
    
    // Save site settings
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentUrl = new URL(tabs[0].url);
      const hostname = currentUrl.hostname;
      
      chrome.storage.sync.get(['blockedSites'], function(result) {
        let blockedSites = result.blockedSites || [];
        
        if (enableToggle.checked) {
          // Remove all variations of the domain
          blockedSites = blockedSites.filter(site => 
            !getDomainVariations(hostname).includes(site)
          );
        } else {
          // Add all variations if not already blocked
          const variations = getDomainVariations(hostname);
          variations.forEach(variation => {
            if (!blockedSites.includes(variation)) {
              blockedSites.push(variation);
            }
          });
        }
        
        chrome.storage.sync.set({blockedSites: blockedSites}, function() {
          showStatus('saved, refresh for changes.', 3000);
          updateSitesList(blockedSites);
        });
      });
    });
  });

  // Add new site
  addSiteButton.addEventListener('click', function() {
    const newSite = newSiteInput.value.trim();
    if (!newSite) return;
    
    chrome.storage.sync.get(['blockedSites'], function(result) {
      let blockedSites = result.blockedSites || [];
      const variations = getDomainVariations(newSite);
      
      // Check if any variation is already blocked
      if (!variations.some(v => blockedSites.includes(v))) {
        // Add all variations
        variations.forEach(variation => blockedSites.push(variation));
        
        chrome.storage.sync.set({blockedSites: blockedSites}, function() {
          newSiteInput.value = '';
          showStatus('Site added!');
          updateSitesList(blockedSites);
        });
      } else {
        showStatus('Site already blocked!');
      }
    });
  });

  // Handle delete site clicks
  siteList.addEventListener('click', function(e) {
    if (!e.target.classList.contains('delete-btn')) return;
    
    const siteToDelete = e.target.dataset.site;
    chrome.storage.sync.get(['blockedSites'], function(result) {
      let blockedSites = result.blockedSites || [];
      // Remove all variations of the domain
      blockedSites = blockedSites.filter(site => 
        !getDomainVariations(siteToDelete).includes(site)
      );
      
      chrome.storage.sync.set({blockedSites: blockedSites}, function() {
        showStatus('Site removed!');
        updateSitesList(blockedSites);
      });
    });
  });

  // Helper function to update sites list UI
  function updateSitesList(sites) {
    siteList.innerHTML = '';
    
    // Get unique normalized domains
    const uniqueDomains = [...new Set(sites.map(site => normalizeDomain(site)))];
    noSitesMessage.style.display = uniqueDomains.length ? 'none' : 'block';
    
    uniqueDomains.forEach(domain => {
      const li = document.createElement('li');
      li.className = 'site-item';
      li.innerHTML = `
        <span>${domain}</span>
        <button class="delete-btn" data-site="${domain}">Remove</button>
      `;
      siteList.appendChild(li);
    });

    // Update scroll indicators after updating the list
    updateScrollIndicators();
  }

  // Helper function to show status message with custom duration
  function showStatus(message, duration = 2000) {
    statusText.textContent = message;
    statusText.style.display = 'block';
    setTimeout(() => {
      statusText.style.display = 'none';
    }, duration);
  }
}); 