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
  const themeSelect = document.querySelector('.theme-select');
  const themeSelectValue = document.querySelector('.theme-select-value');
  const themeSelectContent = document.querySelector('.theme-select-content');
  const catPreview = document.getElementById('catPreview');

  let hasUnsavedChanges = false;

  // Function to update save button appearance
  function updateSaveButton() {
    if (hasUnsavedChanges) {
      saveButton.style.backgroundColor = 'hsl(var(--destructive))';
      saveButton.textContent = 'Save Changes*';
    } else {
      saveButton.style.backgroundColor = 'hsl(var(--primary))';
      saveButton.textContent = 'Save Setting';
    }
  }

  // Function to mark changes as unsaved
  function markAsUnsaved() {
    hasUnsavedChanges = true;
    updateSaveButton();
  }

  // Function to update cat preview
  function updateCatPreview(theme) {
    const selectedPreview = document.getElementById('selectedPreview');
    selectedPreview.src = `cats/${theme}.gif`;
    markAsUnsaved();
  }

  // Load current cat theme
  chrome.storage.sync.get(['catTheme'], function(result) {
    const theme = result.catTheme || 'oneko';
    // Update the selected item and value text
    const items = document.querySelectorAll('.theme-select-item');
    items.forEach(item => {
      if (item.dataset.value === theme) {
        item.dataset.selected = 'true';
        themeSelectValue.textContent = item.querySelector('span').textContent;
        updateCatPreview(theme);
      } else {
        item.dataset.selected = 'false';
      }
    });
    hasUnsavedChanges = false;
    updateSaveButton();
  });

  // Handle theme select click
  themeSelect.addEventListener('click', function(e) {
    const isOpen = themeSelect.dataset.state === 'open';
    themeSelect.dataset.state = isOpen ? 'closed' : 'open';
    themeSelect.setAttribute('aria-expanded', !isOpen);
    e.stopPropagation();
  });

  // Handle theme item selection
  themeSelectContent.addEventListener('click', function(e) {
    e.stopPropagation(); // Stop event from bubbling up
    const item = e.target.closest('.theme-select-item');
    if (!item) return;

    const selectedTheme = item.dataset.value;
    const items = document.querySelectorAll('.theme-select-item');
    
    items.forEach(i => {
      i.dataset.selected = i === item ? 'true' : 'false';
    });

    themeSelectValue.textContent = item.querySelector('span').textContent;
    
    // Ensure dropdown is closed
    setTimeout(() => {
      themeSelect.dataset.state = 'closed';
      themeSelect.setAttribute('aria-expanded', 'false');
    }, 0);
    
    updateCatPreview(selectedTheme);
  });

  // Close select when clicking outside
  document.addEventListener('click', function(e) {
    if (!themeSelect.contains(e.target)) {
      themeSelect.dataset.state = 'closed';
      themeSelect.setAttribute('aria-expanded', 'false');
    }
  });

  // Handle keyboard navigation
  themeSelect.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const isOpen = themeSelect.dataset.state === 'open';
      themeSelect.dataset.state = isOpen ? 'closed' : 'open';
      themeSelect.setAttribute('aria-expanded', !isOpen);
    } else if (e.key === 'Escape') {
      themeSelect.dataset.state = 'closed';
      themeSelect.setAttribute('aria-expanded', 'false');
    }
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
      hasUnsavedChanges = false;
      updateSaveButton();
    });
  });

  // Add change event listener to the toggle
  enableToggle.addEventListener('change', function() {
    markAsUnsaved();
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
    const selectedTheme = document.querySelector('.theme-select-item[data-selected="true"]').dataset.value;
    
    // Save theme
    chrome.storage.sync.set({ catTheme: selectedTheme });
    
    // Save site settings
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentUrl = new URL(tabs[0].url);
      const hostname = currentUrl.hostname;
      const currentTab = tabs[0];
      
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
          hasUnsavedChanges = false;
          updateSaveButton();
          
          // Send message to content script to update in real-time
          chrome.tabs.sendMessage(currentTab.id, { 
            action: "update_settings",
            data: { 
              catTheme: selectedTheme,
              blockedSites: blockedSites
            }
          });
          
          showStatus('Settings applied!', 2000);
          updateSitesList(blockedSites);
        });
      });
    });
  });

  // Add new site
  addSiteButton.addEventListener('click', function() {
    const newSite = newSiteInput.value.trim();
    if (!newSite) return;
    
    chrome.storage.sync.get(['blockedSites', 'catTheme'], function(result) {
      let blockedSites = result.blockedSites || [];
      const catTheme = result.catTheme || 'oneko';
      const variations = getDomainVariations(newSite);
      
      // Check if any variation is already blocked
      if (!variations.some(v => blockedSites.includes(v))) {
        // Add all variations
        variations.forEach(variation => blockedSites.push(variation));
        
        chrome.storage.sync.set({blockedSites: blockedSites}, function() {
          newSiteInput.value = '';
          
          // Notify all tabs about the change
          chrome.tabs.query({}, function(tabs) {
            tabs.forEach(tab => {
              chrome.tabs.sendMessage(tab.id, {
                action: "update_settings",
                data: {
                  catTheme: catTheme,
                  blockedSites: blockedSites
                }
              });
            });
          });
          
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
    chrome.storage.sync.get(['blockedSites', 'catTheme'], function(result) {
      let blockedSites = result.blockedSites || [];
      const catTheme = result.catTheme || 'oneko';
      
      // Remove all variations of the domain
      blockedSites = blockedSites.filter(site => 
        !getDomainVariations(siteToDelete).includes(site)
      );
      
      chrome.storage.sync.set({blockedSites: blockedSites}, function() {
        // Notify all tabs about the change
        chrome.tabs.query({}, function(tabs) {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              action: "update_settings",
              data: {
                catTheme: catTheme,
                blockedSites: blockedSites
              }
            });
          });
        });
        
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