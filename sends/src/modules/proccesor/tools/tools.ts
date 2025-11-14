const tools = [
  {
    type: "function",
    function: {
      name: "generate_message_variations",
      description:
        "Создать несколько уникальных вариантов исходного сообщения, сохраняя его исходный смысл и тональность.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Исходное сообщение, которое нужно вариатизировать.",
          },
          count: {
            type: "integer",
            minimum: 1,
            maximum: 20,
            description:
              "Количество уникальных вариантов, которые необходимо получить.",
          },
        },
        required: ["message", "count"],
        additionalProperties: false,
      },
    },
  },
];

export default tools;