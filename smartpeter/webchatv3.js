const webchatController = {version:95}; //only relevant for the regex matching :D
webchatController.cognigyEndpoint =
  "https://endpoint-app.cognigy.ds-prod.salzburg-ag.at/a94b6087b534cb0d6f3d73d8ef17c501e2c58bee60c8728a8ef18c8a3a14556f";
webchatController.greeting = "Hallo ich bin Smart Peter, kann ich dir helfen?"; // Automatically displayed engagement message//default cognigy expiration is 30 days --> https://github.com/Cognigy/Webchat/blob/82a51e6af8e477f8a2941cf0c751ae5dc9fb9f6d/src/webchat-ui/components/presentational/previous-conversations/helpers.ts
webchatController.historyTimeframe = 1000 * 60 * 60 * 24; // Time in milliseconds, the session will be hold since conversation begin
webchatController.engagementMessageDelay = 5000; // Waiting time to display the engagement message, since the webpage is loaded
webchatController.engagementMessageDisabledTime = 20 * 60 * 1000; // Time between engagement messages (prevent spam) 20 minutes
webchatController.loading;
webchatController.webchatSession;
webchatController.accepted_gdpr = false;
webchatController.pluginUrls = [];
webchatController.sessionIsValid = true;
webchatController.buttonHandlers = [];
webchatController.waitForElementToExist = (
  selectorQuery,
  payload,
  callbacks,
  webchat
) => {
  try {
    let el = document.querySelector(selectorQuery);
    if (!el) {
      window.requestAnimationFrame(function () {
        webchatController.waitForElementToExist(
          selectorQuery,
          payload,
          callbacks,
          webchat
        );
      });
    } else {
      for (const callback of callbacks) {
        callback(payload, el, webchat);
      }
    }
  } catch (e) {
    console.error("Could not wait for element to exist!", e);
  }
};

webchatController.logger = (value) => {
  if (
    [
      "https://www.salzburg-ag.at/",
      "https://www.salzburgnetz.at/",
      "https://www.5schaetze.at/",
    ].find((link) => window.location.href.includes(link))
  ) {
    // if in the production env, do not log.
    return;
  }
  console.log(`[BOT:LOGS]==>`, value);
};
webchatController.loadScript = (src, callback) => {
  var script = document.createElement("script");
  script.setAttribute("src", src);

  function handleLoad() {
    callback(null);
  }

  script.onload = handleLoad;

  document.body.appendChild(script);
};
webchatController.loadScripts = (urls, callback) => {
  try {
    if (!urls || urls.length === 0) return callback(null);

    var loaded = 0;

    function onLoad() {
      loaded++;

      if (loaded === urls.length) callback(null);
    }

    urls.forEach(function (url) {
      webchatController.loadScript(url, onLoad);
    });
  } catch (err) {
    logger(err);
  }
};
webchatController.monitorDisabledActionElements = (
  _,
  chatContainer,
  webchat
) => {
  // Function to enable a button
  function enableButton(button) {
    if (!webchat || !webchatController.sessionIsValid) return;
    button.disabled = false;
    button.style.pointerEvents = "all";
    button.style.cursor = "pointer";
    if (webchatController.webchatSession) {
      const label = button.innerText.trim();
      for (const message of webchatController.webchatSession?.messages) {
        if (message.data?._cognigy?._default?._quickReplies) {
          const quickReplies =
            message.data?._cognigy?._default?._quickReplies.quickReplies;
          if (quickReplies) {
            const matching_quick_reply = quickReplies.find(
              (quickReply) => quickReply.title === label
            );
            if (matching_quick_reply) {
              button.dataset.payload = matching_quick_reply.payload;
              break;
            }
          }
        }
      }
    }
    button.addEventListener("click", (ev) => {
      const chatMessagesContainer = document.getElementById(
        "webchatChatHistoryWrapperLiveLogPanel"
      );

      if (!chatMessagesContainer) return;
      const label = ev.target.innerText;
      const payload = button.dataset.payload;
      webchat.sendMessage(payload || label, {}, { label });
      chatMessagesContainer.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
    });
  }
  // Automatically enable a button after a delay (or other event)
  function autoReactivate(button) {
    setTimeout(() => enableButton(button), 500); // Example: Enable after 0.5 seconds
  }
  // MutationObserver to monitor dynamically added buttons
  const observer = new MutationObserver((mutations) => {
    webchatController.handleInteractivity(webchat);
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (
          node.nodeType === 1 &&
          node.classList.contains("webchat-quick-reply-template-button") &&
          node.disabled
        ) {
          autoReactivate(node);
        }
      });
    });
    [
      document.getElementById("cognigyConversationListBranding"),
      document.getElementById("cognigyHomeScreenBranding"),
      document.getElementById("cognigyBrandingLink"),
    ].forEach((link) => {
      if (link) {
        link.href = "https://www.salzburg-ag.at/kontakt/lea.html";
      }
    });
    const prevConversationSendButton = document.querySelector(
      "button.webchat-prev-conversations-send-button"
    );
    const chatWithLeaButton = document.querySelector(
      "button.webchat-homescreen-send-button"
    );
    /***
     * if the button exists, replace the click action
     */
    [
      { element: prevConversationSendButton, stopProp: true },
      { element: chatWithLeaButton, stopProp: false },
    ].forEach(({ element: buttonElement, stopProp }, index) => {
      if (buttonElement) {
        //webchatController.logger(buttonElement.classList.toString());
        /***
         * if last handler exists, it should be remove before setting a new one.
         */
        const lastHandler = webchatController.buttonHandlers[index];
        if (lastHandler) {
          buttonElement.removeEventListener("click", lastHandler);
          webchatController.buttonHandlers[index] = null;
        }
        //webchatController.logger("Handler has been set.");
        const handler = webchatController.openChat(
          buttonElement,
          webchat,
          stopProp
        );
        webchatController.buttonHandlers[index] = handler;
      } else {
        webchatController.buttonHandlers[index] = null;
      }
    });
    //webchatController.logger(webchatController.buttonHandlers);
  });

  // Observe the chat container for new child nodes
  observer.observe(chatContainer, {
    childList: true,
    subtree: true, // Enables observation of nested changes
  });
};
webchatController.fetchConfig = (url, callback) => {
  var request = new XMLHttpRequest();
  request.open("GET", url, true);

  request.onload = function () {
    if (request.status >= 200 && request.status < 400) {
      var data = JSON.parse(request.responseText);

      callback(null, data);
    } else {
      callback("Could not parse json");
    }
  };

  request.onerror = function () {
    callback("Request failed");
  };

  request.send();
};
webchatController.getStorageKeysIncludes = (prefix) => {
  const matchingKeys = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes(prefix)) {
      matchingKeys.push(key);
    }
  }
  return matchingKeys;
};

webchatController.handleInteractivity = (webchat) => {
  try {
    if (webchat.client?.socketOptions) {
      const { sessionId, userId } = webchat.client?.socketOptions;
      for (const key of webchatController.getStorageKeysIncludes(
        "admin-webchat"
      )) {
        if (key.includes(sessionId) && key.includes(userId)) {
          // check validity
          const webchat_session = JSON.parse(localStorage.getItem(key));
          webchatController.webchatSession = webchat_session;
          if (!webchat_session) throw new Error("No Webchat Session");
          const first_message = webchat_session.messages[0];
          if (!first_message) throw new Error("No message in conversation");
          const validUntil =
            first_message.timestamp + webchatController.historyTimeframe;
          if (!validUntil) throw new Error("No Valid Until");
          if (validUntil < Date.now()) {
            /*** Expired */
            webchatController.sessionIsValid = false;
            const webchat_input = document.querySelector(".webchat-input");
            if (!webchat_input || !webchat_input.style)
              throw new Error("NO Webchat Input");
            webchat_input.style.display = "none";
            /**** Disable all buttons and quick replies */
            let hidden_elements = [];
            hidden_elements = [
              ...document.querySelectorAll(
                ".webchat-root[data-cognigy-webchat-root] .webchat-quick-reply-template-root"
              ),
              ...document.querySelectorAll(
                ".webchat-root[data-cognigy-webchat-root] .webchat-quick-reply-template-replies-container"
              ),
              ...document.querySelectorAll(
                ".webchat-root[data-cognigy-webchat-root] .webchat-buttons-template-root"
              ),
              ...document.querySelectorAll(
                ".webchat-root[data-cognigy-webchat-root] button.MuiButtonBase-root.MuiButton-root.MuiButton-outlined"
              ),
              ...document.querySelectorAll(
                ".webchat-root[data-cognigy-webchat-root] .webchat-buttons-template-root"
              ),
              ...document.querySelectorAll(
                ".webchat-root[data-cognigy-webchat-root] .webchat-carousel-template-content [data-testid='action-buttons']"
              ),
            ];

            for (const hidden_element of hidden_elements) {
              hidden_element.style.pointerEvents = "none";
              hidden_element.disabled = true;
              hidden_element.style.cursor = "not-allowed";
            }
          } else {
            throw new Error("Still valid. So show the text field");
          }
        }
      }
    } else {
      throw new Error("No Socket Options");
    }
  } catch (err) {
    /**** Make Text Field visible */
    // console.log(err);
    webchatController.sessionIsValid = true;
    const webchat_input = document.querySelector(".webchat-input");
    if (webchat_input) {
      webchat_input.style.display = "";
    }
  }
};
webchatController.getMostRecentSession = () => {
  /****** Loop through all stored conversations */
  let validAdminChat = undefined;
  let validAdminSessionId = undefined;
  const prefix = "admin-webchat";
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes(prefix)) {
      try {
        const adminChat = JSON.parse(localStorage.getItem(key));
        const keyArr = JSON.parse(key);
        const first_message = adminChat.messages[0];
        if (first_message) {
          const validUntil =
            first_message.timestamp + webchatController.historyTimeframe;
          if (validUntil) {
            if (validUntil >= Date.now()) {
              /*** Not Expired = valid */
              if (!validAdminChat) {
                /**** If admin chat var is still undefined; set */
                validAdminChat = adminChat;
                validAdminSessionId = keyArr[keyArr.length - 2];
              }
              /**** Compare their latest message's timestamp */
              const adminChat_timestamp = adminChat.messages[0].timestamp;
              const validAdminChat_timestamp =
                validAdminChat.messages[0].timestamp;

              if (adminChat_timestamp > validAdminChat_timestamp) {
                /***  if the current chat's timestamp is more recent than that of the past one, then replace */
                validAdminChat = adminChat;
                validAdminSessionId = keyArr[keyArr.length - 2];
              }
            }
          }
        }
      } catch (err) {}
    }
  }

  return { validAdminSessionId, validAdminChat };
};
webchatController.setChatSession = () => {
  const { validAdminChat, validAdminSessionId } =
    webchatController.getMostRecentSession();
  if (!validAdminSessionId) {
    webchatController.webchatSession = {
      messages: [],
      sessionId: "session-" + Date.now() * Math.random(),
    };
  } else {
    webchatController.webchatSession = {
      ...validAdminChat,
      sessionId: validAdminSessionId,
    };
  }
};
webchatController.getSessionValidity = (sessionId, userId) => {
  try {
    const keys = webchatController.getStorageKeysIncludes(sessionId);
    const key = keys.length > 0 ? keys[0] : "";
    if (key.includes(sessionId) && key.includes(userId)) {
      // check validity
      const webchat_session = JSON.parse(localStorage.getItem(key));
      webchatController.webchatSession = webchat_session;
      if (!webchat_session) return false;
      const first_message = webchat_session.messages[0];
      if (!first_message) return false;
      const validUntil =
        first_message.timestamp + webchatController.historyTimeframe;
      if (!validUntil) return false;
      if (validUntil < Date.now()) {
        /*** Expired */
        return false;
      }
      return true;
    } else {
      return true;
    }
  } catch (err) {
    return false;
  }
};
webchatController.openChat = (element, webchat, stopPropagation) => {
  const handler = (event) => {
    //event.stopPropagation();
    //console.log(webchat);
    const sessionId = localStorage.getItem("BOT_WEBCHAT_CURRENT_SESSIONID");
    const userId = localStorage.getItem("userId");
    const session_is_valid = webchatController.getSessionValidity(
      sessionId,
      userId
    );

    if (session_is_valid) {
      webchatController.logger(
        `Switched Session is not expired --> ${sessionId}`
      );
      // if session is valid, do not change current session id
      if (stopPropagation) {
        webchatController.logger("Stopping Propagation");
        event.stopPropagation();
        const conversation =
          webchat.store?.getState().prevConversations?.[sessionId];
        webchat.store.dispatch({
          type: "SWITCH_SESSION",
          sessionId,
          conversation,
        });
        webchat.store.dispatch({
          type: "SET_SHOW_PREV_CONVERSATIONS",
          showPrevConversations: false,
        });
      }
    } else {
      try {
        const { validAdminSessionId } =
          webchatController.getMostRecentSession();
        // console.log(webchat.switchSession);

        webchatController.logger(
          `Most Recent and valid Session : ${validAdminSessionId}`
        );

        if (validAdminSessionId) {
          if (stopPropagation) {
            event.stopPropagation();
          }
          webchatController.logger(
            `Switching to exisiting valid session. ${validAdminSessionId}`
          );
          webchat.store.dispatch({
            type: "SWITCH_SESSION",
            sessionId: validAdminSessionId,
          });
          webchat.store.dispatch({
            type: "SET_SHOW_PREV_CONVERSATIONS",
            showPrevConversations: false,
          });
        } else {
          webchat.store.dispatch({
            type: "SWITCH_SESSION",
            sessionId: "session-" + Date.now() * Math.random(),
          });
          webchatController.logger(`Switching to new valid session.`);
        }
      } catch (err) {
        webchatController.logger(err?.message);
      }
    }

    //webchat.startConversation();
  };
  element.addEventListener("click", handler);
  return handler;
};

webchatController.init = (
  engagementMessageText = "",
  initCallback = (webchat) => {}
) => {
  webchatController.logger(`[Engagement Message]: ${engagementMessageText}`);
  webchatController.fetchConfig(
    webchatController.cognigyEndpoint,
    (err, config) => {
      if (err) return;

      var settings = config.settings;

      if (settings.pluginUrls) {
        webchatController.pluginUrls = webchatController.pluginUrls.concat(
          settings.pluginUrls
        );
      }

      // console.log(webchatController.webchatSession);
      webchatController.loadScripts(webchatController.pluginUrls, () => {
        initWebchat(
          webchatController.cognigyEndpoint,
          {
            channel: "admin-webchat",
            sessionId: webchatController.webchatSession?.sessionId,
            settings: {
              teaserMessage: {
                text: engagementMessageText,
                teaserMessageDelay: webchatController.engagementMessageDelay,
              },
              embeddingConfiguration: {
                //useSessionStorage: true,
                awaitEndpointConfig: true,
              },
              behavior: {
                focusInputAfterPostback: true,
              },
              widgetSettings: {
                enableFocusTrap: true,
              },
              getStartedData: {
                language: navigator.language || navigator.userLanguage || "de",
              },
            },
          },
          (webchat) => {
            // initialize the local storage current session id
            localStorage.setItem(
              "BOT_WEBCHAT_CURRENT_SESSIONID",
              webchatController.webchatSession?.sessionId
            );
            if (webchat) {
              webchatController.waitForElementToExist(
                ".webchat-root",
                settings,
                [webchatController.monitorDisabledActionElements],
                webchat
              );

              initCallback(webchat);
            }

            // https://github.com/Cognigy/SocketClient/blob/master/src/socket-client.ts#L229C14-L229C21

            if (!webchatController.accepted_gdpr) {
              if (localStorage.getItem("webchat_v3_accepted_gdpr")) {
                webchatController.accepted_gdpr = true;
              }
            }
            webchat.registerAnalyticsService((event) => {
              if (event.type === "webchat/switch-session") {
                // update current session id
                localStorage.setItem(
                  "BOT_WEBCHAT_CURRENT_SESSIONID",
                  event.payload
                );
              }
              if (event.type === "webchat/incoming-message") {
                localStorage.setItem(
                  "nextWebchatEngagement",
                  "" +
                    (Date.now() +
                      webchatController.engagementMessageDisabledTime)
                );
                webchatController.waitForElementToExist(
                  "#webchatChatHistory .webchat-typing-indicator:not([class*='_incoming_'])",
                  null,
                  [
                    (_, el) => {
                      const webchatChatHistory = document.getElementById(
                        "webchatChatHistoryWrapperLiveLogPanel"
                      );
                      timeout = undefined;
                      if (webchatChatHistory) {
                        const elements = webchatChatHistory.querySelectorAll(
                          "div > article:has(header)"
                        );
                        if (elements.length > 0) {
                          const lastElementWithHeader =
                            elements[elements.length - 1];
                          let lastUserMessage = undefined;
                          elements.forEach((element) => {
                            if (element.classList.contains("user")) {
                              lastUserMessage = element;
                            }
                          });
                          if (lastElementWithHeader) {
                            webchatController.logger("Scrolling to Top");

                            window.webchatChatHistory = webchatChatHistory;
                            window.lastElementWithHeader =
                              lastElementWithHeader;
                            webchatChatHistory.parentElement.scrollTo({
                              top: lastUserMessage
                                ? lastUserMessage.previousSibling.offsetTop
                                : lastElementWithHeader.previousSibling
                                    .offsetTop,
                              behavior: "instant",
                            });
                          }
                        }
                      }
                    },
                  ],
                  webchat
                );
              } else if (event.type === "webchat/outgoing-message") {
                // Add URL to the payload
                event.payload.data = {
                  ...event.payload.data,
                  url: window.location.href,
                  language:
                    navigator.language || navigator.userLanguage || "de",
                };
                if (event.payload?.data?.accepted_gdpr) {
                  localStorage.setItem("webchat_v3_accepted_gdpr", "true");
                }
              } else if (event.type === "webchat/close") {
              }
            });
          }
        );
      });
    }
  );
};

webchatController.setChatSession();
webchatController.nextEngagement = parseInt(
  localStorage.getItem("nextWebchatEngagement")
);

window.webchatController = webchatController;
