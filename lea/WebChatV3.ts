class WebChatV3 {

    private readonly $element: JQuery<HTMLElement>;
    private chatButton: HTMLElement;

    constructor($element: JQuery<HTMLElement>) {
        this.$element = $element;

        const controller = (window as any).webchatController;
        controller.endpoint = this.$element.data('webchat-endpoint'); // URL to your Cognigy endpoint
        controller.greeting = this.$element.data('webchat-engagement-message'); // Greeting message

        if (Number.isInteger(controller.nextEngagement)) {
            controller.logger("[Engagement Message]: Exists");
            if (controller.nextEngagement < Date.now()) {
                controller.logger("[Engagement Message]: The Disabled Time is Over");
                controller.init(controller.greeting, (webchat: any) => {this.initCallBack(webchat)});
            } else {
                controller.logger("[Engagement Message]: Remains Disabled");
                controller.init("", (webchat: any) => {this.initCallBack(webchat)});
            }
        } else {
            controller.logger(
                "[Engagement Message]: Does not exist; So automatically show"
              );
            controller.init(controller.greeting, (webchat: any) => {this.initCallBack(webchat)});
        }

        this.runCustomizations();
    }

    private initCallBack(webchat: any) {
        console.log('webchat', webchat);
        this.$element.data('webchatInstance', webchat);
        if (this.$element.data('webchat-load-by-parameter')) {
            const query = window.location.search;
            const params = new URLSearchParams(query);
            if (params.get('openbot') === '1') {
                webchat.open();
                const labelConf = params.has('label') ? {
                    label: params.get('label')
                } : undefined;
                webchat.sendMessage(params.get('payload'), {}, labelConf);
                setTimeout(() => {
                    (window as any).$('.webchat-root .webchat-homescreen-send-button').click();
                }, 200);
            }
        }
    }


    private runCustomizations(): void {
        const webchatOvserver = new MutationObserver((mutationRecords) => {this.iconSwitcher(mutationRecords)});

        this.waitForElementToExist('.webchat-root .webchat-toggle-button', (el) => {this.animationHandler(el)});
        this.waitForElementToExist('.webchat-root', el => {webchatOvserver.observe(el, {childList: true})});
        this.waitForElementToExist('.webchat-root .webchat-unread-message-preview', (el) => {this.constructEngagementMessageCloseButton(el)});
    }


    private waitForElementToExist(selectorQuery: string, callback: (el: HTMLElement) => void): void {
        try {
            let el = document.querySelector(selectorQuery);
            if (!el){
                window.requestAnimationFrame(() => {this.waitForElementToExist(selectorQuery, callback);})
            } else {
                callback(el as HTMLElement);
            }
        } catch (e) {
            console.error("Could not wait for element to exist!", e);
        }
    }


    private animationHandler(el: HTMLElement) {
        this.chatButton = el;
        this.chatButton.classList.add('cognigy-pulse', 'avatar');
        //console.log(el)
        this.waitForElementToExist('.webchat-root .webchat-unread-message-preview, .webchat-root .webchat ', ()=>{
            this.chatButton.classList.remove('cognigy-pulse');
        });
    }


    private constructEngagementMessageCloseButton(engagementMessageDiv: HTMLElement){
        const closeButton = document.createElement('div');
        closeButton.classList.add('gg-close-o')

        closeButton.addEventListener('click', event =>{
            event.stopPropagation();
            engagementMessageDiv.classList.add('close-animtaion');
        });
        engagementMessageDiv.appendChild(closeButton);
    }

    private iconSwitcher(mutationRecords:MutationRecord[]){
        const webchatStatus = mutationRecords.filter(mutationRecord => {
            const added = Array.from(mutationRecord.addedNodes).reduce((prev, node) => {
                return prev ? true : (node as HTMLElement).classList.contains('webchat');
            }, false);
            const removed = Array.from(mutationRecord.removedNodes).reduce((prev, node) => {
                return prev ? true : (node as HTMLElement).classList.contains('webchat');
            }, false);

            if (added){
                this.chatButton.classList.remove('avatar');
            } else if (removed){
                this.chatButton.classList.add('avatar');
            }
        });
    }


}

export default WebChatV3;
