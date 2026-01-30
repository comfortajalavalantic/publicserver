
(function() {
	try {
		let chatButton;

		const webchatOvserver = new MutationObserver(iconSwitcher);

	 	waitForElementToExist('.webchat-root .webchat-toggle-button', animationHandler);
		waitForElementToExist('.webchat-root', el => {webchatOvserver.observe(el, {childList: true})});
		waitForElementToExist('.webchat-root .webchat-unread-message-preview', constructEngagementMessageCloseButton);

		function waitForElementToExist(selectorQuery, callback){
			try {
			  let el = document.querySelector(selectorQuery);
			  if (!el){
					window.requestAnimationFrame(function() {waitForElementToExist(selectorQuery, callback);})
			  } else {
					callback(el);
			  }
			} catch (e) {
				console.error("Could not wait for element to exist!", e);
			}
		}

		function animationHandler(el){
			chatButton = el;
			chatButton.classList.add('cognigy-pulse', 'avatar');
			//console.log(el)
			waitForElementToExist('.webchat-root .webchat-unread-message-preview, .webchat-root .webchat ', ()=>{
				chatButton.classList.remove('cognigy-pulse');
			});
		}

		function iconSwitcher(mutationRecords){
			const webchatStatus = mutationRecords.filter(mutationRecord => {
				const added = Array.from(mutationRecord.addedNodes).reduce((prev, node) => {
					return prev ? true : node.classList.contains('webchat');
				}, false);
				const removed = Array.from(mutationRecord.removedNodes).reduce((prev, node) => {
					return prev ? true : node.classList.contains('webchat');
				}, false);

				if (added){
					chatButton.classList.remove('avatar');
				} else if (removed){
					chatButton.classList.add('avatar');
				}
			});
		}

		function constructEngagementMessageCloseButton(engagementMessageDiv){
			const closeButton = document.createElement('div');
			closeButton.classList.add('gg-close-o')

			closeButton.addEventListener('click', event =>{
				event.stopPropagation();
				engagementMessageDiv.classList.add('close-animtaion');
			});
			engagementMessageDiv.appendChild(closeButton);
		}
		
	} catch (e) {
		console.error("Cognigy webchat customization errored!", e);
	}
})();