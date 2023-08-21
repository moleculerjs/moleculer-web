/* eslint-disable no-undef */
document.addEventListener("DOMContentLoaded", () => {
	const messages1 = document.getElementById("messages1");
	const messages2 = document.getElementById("messages2");

	const sendMessage = async (userName, message) => {
		return fetch("/api/chat/message", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				user: userName,
				message: message,
			}),
		});
	};

	const addMessage = (element, message) => {
		const messageElement = document.createElement("div");
		messageElement.textContent = message;
		element.appendChild(messageElement);
		element.scrollTop = element.scrollHeight;
	};

	const setupSSE = (element) => {
		const eventSource = new EventSource("/api/chat/message");

		eventSource.addEventListener("chat.message", (event) => {
			const data = JSON.parse(event.data);
			addMessage(element, `${data.user}: ${data.message}`);
		});

		eventSource.addEventListener("error", (error) => {
			console.error(error);
		});
	};

	document.querySelectorAll(".send-button").forEach((button) => {
		button.addEventListener("click", () => {
			const chatBox = button.closest(".chat-box");
			const userNameInput = chatBox.querySelector(".user-name");
			const messageInput = chatBox.querySelector(".message");
			const userName = userNameInput.value.trim();
			const message = messageInput.value.trim();

			if (userName && message) {
				sendMessage(userName, message);
				messageInput.value = "";
			}
		});
	});

	setupSSE(messages1);
	setupSSE(messages2);
});
