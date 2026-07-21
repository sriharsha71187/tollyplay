export interface TriviaQ {
  q: string
  answer: string
  wrong: [string, string, string]
}

export const trivia: TriviaQ[] = [
  { q: 'In which film does Kattappa kill Baahubali?', answer: 'Baahubali: The Beginning', wrong: ['Baahubali 2: The Conclusion', 'Magadheera', 'Chatrapathi'] },
  { q: 'Which 1931 film was the first Telugu talkie?', answer: 'Bhakta Prahlada', wrong: ['Mala Pilla', 'Raithu Bidda', 'Pathala Bhairavi'] },
  { q: 'In Eega, the hero is reborn as…?', answer: 'A housefly', wrong: ['A sparrow', 'An ant', 'A parrot'] },
  { q: 'Who played Ghatotkacha in Mayabazar (1957)?', answer: 'S. V. Ranga Rao', wrong: ['N. T. Rama Rao', 'Akkineni Nageswara Rao', 'Relangi'] },
  { q: "'Naatu Naatu' won the Oscar for Best Original Song — from which film?", answer: 'RRR', wrong: ['Pushpa: The Rise', 'Baahubali 2: The Conclusion', 'Ala Vaikunthapurramuloo'] },
  { q: 'Which 1989 Ram Gopal Varma film made a cycle chain iconic?', answer: 'Siva', wrong: ['Kshana Kshanam', 'Gaayam', 'Shool'] },
  { q: 'Manam (2014) united which three generations of one family?', answer: 'ANR, Nagarjuna & Naga Chaitanya', wrong: ['NTR, Balakrishna & Kalyan Ram', 'Krishna, Mahesh Babu & Ghattamaneni juniors', 'Chiranjeevi, Ram Charan & Allu Arjun'] },
  { q: 'Which sport drives the story of Sye (2004)?', answer: 'Rugby', wrong: ['Football', 'Hockey', 'Kabaddi'] },
  { q: 'In Okkadu, Mahesh Babu plays which sportsman?', answer: 'A kabaddi player', wrong: ['A cricketer', 'A boxer', 'A cyclist'] },
  { q: 'Pokiri was remade in Hindi as…?', answer: 'Wanted', wrong: ['Dabangg', 'Rowdy Rathore', 'Singham'] },
  { q: 'In Magadheera, the lovers reunite after how many years?', answer: '400', wrong: ['100', '250', '1000'] },
  { q: "Pushpa smuggles which 'red gold'?", answer: 'Red sanders', wrong: ['Saffron', 'Rubies', 'Sandalwood oil'] },
  { q: 'Who directed both Sankarabharanam and Sagara Sangamam?', answer: 'K. Viswanath', wrong: ['Bapu', 'Dasari Narayana Rao', 'K. Raghavendra Rao'] },
  { q: "Salaar's director also made which blockbuster series?", answer: 'KGF', wrong: ['Pushpa', 'Baahubali', 'HIT'] },
  { q: 'Kalki 2898 AD reimagines which epic in the far future?', answer: 'Mahabharata', wrong: ['Ramayana', 'Iliad', 'Bhagavata Purana'] },
  { q: 'Major (2022) tells the story of which real-life hero?', answer: 'Sandeep Unnikrishnan', wrong: ['Hanumanthappa Koppad', 'Vikram Batra', 'Abhinandan Varthaman'] },
  { q: "Sita Ramam's romance unfolds through…?", answer: 'Letters', wrong: ['Phone calls', 'Telegrams', 'Dreams'] },
  { q: 'C/o Kancharapalem was celebrated for casting…?', answer: 'All newcomers and locals', wrong: ['Only theatre veterans', 'A single actor in all roles', 'Real-life couples'] },
  { q: 'Which 1998 Pawan Kalyan film won the National Award for Best Telugu Film?', answer: 'Tholi Prema', wrong: ['Badri', 'Kushi', 'Suswagatham'] },
  { q: 'Baahubali 2 was the first Telugu film to cross…?', answer: '₹1000 crore worldwide', wrong: ['₹100 crore worldwide', '$10M in the US', '1 crore admissions'] },
  { q: "Arundhati's villain Pasupathi was played by…?", answer: 'Sonu Sood', wrong: ['Prakash Raj', 'Sayaji Shinde', 'Ravi Kishan'] },
  { q: 'Happy Days (2007) follows four years in…?', answer: 'An engineering college', wrong: ['A medical college', 'An army academy', 'A film institute'] },
]

/** Harder tier — for fans who found the basics easy. */
export const triviaHard: TriviaQ[] = [
  { q: 'Who directed Kshana Kshanam (1991)?', answer: 'Ram Gopal Varma', wrong: ['Krishna Vamsi', 'Mani Ratnam', 'Singeetam Srinivasa Rao'] },
  { q: 'Aha Naa Pellanta (1987), the comedy classic, was directed by…?', answer: 'Jandhyala', wrong: ['E. V. V. Satyanarayana', 'Relangi Narasimha Rao', 'Vamsy'] },
  { q: 'In Sagara Sangamam, the failed classical dancer Balu was played by…?', answer: 'Kamal Haasan', wrong: ['Chiranjeevi', 'Akkineni Nageswara Rao', 'Sarath Babu'] },
  { q: "Baahubali's story was written by…?", answer: 'V. Vijayendra Prasad', wrong: ['Trivikram Srinivas', 'Paruchuri Brothers', 'Burra Sai Madhav'] },
  { q: "Chiranjeevi's first released film?", answer: 'Pranam Khareedu', wrong: ['Punadhirallu', 'Khaidi', 'Mana Voori Pandavulu'] },
  { q: "Mahesh Babu's first film as lead hero?", answer: 'Rajakumarudu', wrong: ['Murari', 'Yuvaraju', 'Bobby'] },
  { q: 'Pawan Kalyan debuted with…?', answer: 'Akkada Ammayi Ikkada Abbayi', wrong: ['Gokulamlo Seeta', 'Tholi Prema', 'Suswagatham'] },
  { q: "Telugu cinema's first time-travel film (1991)?", answer: 'Aditya 369', wrong: ['Yamaleela', 'Bhairava Dweepam', 'Ammoru'] },
  { q: 'In Swayam Krushi, Chiranjeevi earns his living as a…?', answer: 'Cobbler', wrong: ['Potter', 'Blacksmith', 'Weaver'] },
  { q: 'Who composed the music of Sankarabharanam?', answer: 'K. V. Mahadevan', wrong: ['Ilaiyaraaja', 'K. Chakravarthy', 'Ramesh Naidu'] },
  { q: 'Gulabi was the directorial debut of…?', answer: 'Krishna Vamsi', wrong: ['Puri Jagannadh', 'Teja', 'S. S. Rajamouli'] },
  { q: 'Prabhas made his debut in…?', answer: 'Eeswar', wrong: ['Raghavendra', 'Varsham', 'Adavi Ramudu'] },
  { q: 'Jr NTR\'s first film as lead hero?', answer: 'Ninnu Choodalani', wrong: ['Student No. 1', 'Aadi', 'Subbu'] },
  { q: 'In Geethanjali (1989), Mani Ratnam paired Nagarjuna with…?', answer: 'Girija Shettar', wrong: ['Amala', 'Vijayashanti', 'Yamuna'] },
]
