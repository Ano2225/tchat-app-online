const questions = [
  {
    question: "Quelle est la capitale de la France ?",
    options: ["Paris", "Lyon", "Marseille", "Toulouse"],
    correctAnswer: 0,
    explanation: "Paris est la capitale de la France depuis 987. C'est aussi la ville la plus peuplée du pays avec plus de 2 millions d'habitants."
  },
  {
    question: "Combien font 2 + 2 ?",
    options: ["3", "4", "5", "6"],
    correctAnswer: 1,
    explanation: "2 + 2 = 4. C'est l'une des premières opérations mathématiques que nous apprenons !"
  },
  {
    question: "Quel est le plus grand océan du monde ?",
    options: ["Atlantique", "Indien", "Arctique", "Pacifique"],
    correctAnswer: 3,
    explanation: "L'océan Pacifique couvre environ 46% de la surface des océans mondiaux et contient plus de la moitié de l'eau libre de la planète."
  },
  {
    question: "En quelle année a eu lieu la Révolution française ?",
    options: ["1789", "1792", "1804", "1815"],
    correctAnswer: 0,
    explanation: "La Révolution française a commencé en 1789 avec la prise de la Bastille le 14 juillet, date devenue fête nationale française."
  },
  {
    question: "Quel est l'élément chimique de symbole 'O' ?",
    options: ["Or", "Oxygène", "Osmium", "Ozone"],
    correctAnswer: 1,
    explanation: "L'oxygène (O) est essentiel à la vie. Il représente environ 21% de l'atmosphère terrestre et est nécessaire à la respiration."
  },
  {
    question: "Combien de continents y a-t-il ?",
    options: ["5", "6", "7", "8"],
    correctAnswer: 2,
    explanation: "Il y a 7 continents : Afrique, Antarctique, Asie, Europe, Amérique du Nord, Océanie et Amérique du Sud."
  },
  {
    question: "Qui a peint la Joconde ?",
    options: ["Picasso", "Van Gogh", "Leonardo da Vinci", "Monet"],
    correctAnswer: 2,
    explanation: "Leonardo da Vinci a peint la Joconde entre 1503 et 1519. Ce chef-d'œuvre est exposé au musée du Louvre à Paris."
  },
  {
    question: "Quelle planète est la plus proche du Soleil ?",
    options: ["Vénus", "Mercure", "Mars", "Terre"],
    correctAnswer: 1,
    explanation: "Mercure est la planète la plus proche du Soleil, à environ 58 millions de kilomètres. Sa température peut atteindre 427°C."
  },
  {
    question: "Quel est le plus petit pays du monde ?",
    options: ["Monaco", "Vatican", "Nauru", "Saint-Marin"],
    correctAnswer: 1,
    explanation: "Le Vatican fait seulement 0,17 km² ! C'est un État enclavé dans Rome, siège de l'Église catholique."
  },
  {
    question: "Combien de côtés a un hexagone ?",
    options: ["5", "6", "7", "8"],
    correctAnswer: 1,
    explanation: "Un hexagone a 6 côtés. On peut en voir dans la nature, comme dans les alvéoles des ruches d'abeilles !"
  },
  {
    question: "Quelle est la monnaie du Japon ?",
    options: ["Won", "Yuan", "Yen", "Dong"],
    correctAnswer: 2,
    explanation: "Le yen (¥) est la monnaie officielle du Japon depuis 1871. C'est la troisième devise la plus échangée au monde."
  },
  {
    question: "Qui a écrit 'Les Misérables' ?",
    options: ["Émile Zola", "Victor Hugo", "Gustave Flaubert", "Honoré de Balzac"],
    correctAnswer: 1,
    explanation: "Victor Hugo a publié 'Les Misérables' en 1862. Ce roman social suit l'histoire de Jean Valjean dans la France du 19ème siècle."
  },
  {
    question: "Quelle est la vitesse de la lumière ?",
    options: ["300 000 km/s", "150 000 km/s", "450 000 km/s", "600 000 km/s"],
    correctAnswer: 0,
    explanation: "La lumière voyage à environ 299 792 458 m/s dans le vide, soit environ 300 000 km/s. Rien ne peut aller plus vite !"
  }
];

const getRandomQuestion = () => {
  const randomIndex = Math.floor(Math.random() * questions.length);
  const question = { ...questions[randomIndex] };
  // Garder l'index ET ajouter le texte de la réponse correcte
  const correctAnswerIndex = question.correctAnswer;
  question.correctAnswerText = question.options[correctAnswerIndex];
  return question;
};

module.exports = { getRandomQuestion };