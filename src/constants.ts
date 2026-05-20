import { Drill } from './types';

export const PREDEFINED_REWARDS = [
  'Ice Cream Trip',
  'New Soccer Ball',
  'New Cleats',
  'Movie Night',
  'Video Game Time',
  'New Lacrosse Stick',
  'Dinner of Choice',
  'Stay Up Late (30 min)',
  'New Practice Shirt',
  'Water Bottle',
  'Trip to the Park',
  'Bowling Night',
];

export const INITIAL_DRILLS: Drill[] = [
  // SOCCER DRILLS (20)
  {
    id: 's1',
    title: 'Ball Taps',
    description: 'Tap the top of the soccer ball with the bottom of each foot as fast as possible.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '100 taps'
  },
  {
    id: 's2',
    title: 'Wall Passes',
    description: 'Pass the ball against a wall and control the rebound with your first touch.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '50 passes'
  },
  {
    id: 's3',
    title: 'Foundations',
    description: 'Quickly knock the ball back and forth between the insides of your feet.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '100 touches'
  },
  {
    id: 's4',
    title: 'Step Overs',
    description: 'Practice the step over move to fake out defenders. Focus on balance.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '20 each foot'
  },
  {
    id: 's5',
    title: 'Scissors',
    description: 'Circle your foot over the ball from inside to outside without touching it.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '20 each foot'
  },
  {
    id: 's6',
    title: 'Cruyff Turn',
    description: 'Fake a pass or shot and pull the ball back behind your standing leg.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '15 turns'
  },
  {
    id: 's7',
    title: 'Figure 8 Dribbling',
    description: 'Dribble through two cones in a figure 8 pattern using all parts of the foot.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '5 rounds'
  },
  {
    id: 's8',
    title: 'Penalty Kicks',
    description: 'Practice clinical finishing from the penalty spot. Focus on corners.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '10 goals'
  },
  {
    id: 's9',
    title: 'Freestyle Juggling',
    description: 'Keep the ball in the air using feet, thighs, and head. Try for a new record.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '5 minutes'
  },
  {
    id: 's10',
    title: 'Speed Dribbling',
    description: 'Sprint 20 yards with the ball kept close, then turn and repeat.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '10 sprints'
  },
  {
    id: 's11',
    title: 'L-Turn (Behind Leg)',
    description: 'Pull the ball back and flick it behind your standing leg to change direction.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '20 turns'
  },
  {
    id: 's12',
    title: 'Pull-Backs',
    description: 'Dribble forward, stop the ball with your sole, and pull it back to turn 180.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '20 reps'
  },
  {
    id: 's13',
    title: 'Triangle Touches',
    description: 'Move the ball in a triangle shape with the sole and inside of your foot.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '30 triangles'
  },
  {
    id: 's14',
    title: 'Box Touches',
    description: 'Control the ball within a 2x2 yard square using all surfaces of the foot.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '3 minutes'
  },
  {
    id: 's15',
    title: 'Shielding Practice',
    description: 'Keep your body between the ball and an imaginary defender for 30 seconds.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '5 rounds'
  },
  {
    id: 's16',
    title: 'Header Technique',
    description: 'Practice heading the ball with your forehead. (Use a softer ball if needed).',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '15 headers'
  },
  {
    id: 's17',
    title: 'Maradona Turn',
    description: 'Spin 360 degrees while rolling your sole over the ball to bypass defenders.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '10 turns'
  },
  {
    id: 's18',
    title: 'In-and-Out Touches',
    description: 'Using one foot, touch with the outside then inside repeatedly while moving.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '50 yards'
  },
  {
    id: 's19',
    title: 'Crossover Turns',
    description: 'Run over the ball and drag it back with your opposite foot sole.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '15 turns'
  },
  {
    id: 's20',
    title: 'Cone Weaving',
    description: 'Fast dribbling through a line of 6 cones spaced 2 yards apart.',
    sports: ['soccer'],
    type: 'sport-specific',
    reps: '10 rounds'
  },

  // LACROSSE DRILLS (20)
  {
    id: 'l1',
    title: 'Wall Ball (Standard)',
    description: 'Catch and throw against a wall, alternating hands each set.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '50 reps each hand'
  },
  {
    id: 'l2',
    title: 'Cradle Walk',
    description: 'Walk 20 yards while cradling the ball securely, focus on two-hand cradle.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '10 lengths'
  },
  {
    id: 'l3',
    title: 'Ground Ball Scoops',
    description: 'Scoop through the ball with your knuckles to the grass. Finish with a cradle.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '40 scoops'
  },
  {
    id: 'l4',
    title: 'Split Dodge',
    description: 'Change hands and direction aggressively across the face of a cone.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '20 dodges'
  },
  {
    id: 'l5',
    title: 'Roll Dodge',
    description: 'Protect the ball by rolling your back to the defender while turning.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '20 dodges'
  },
  {
    id: 'l6',
    title: 'Poke Checks',
    description: 'Practice the defensive poke check against an imaginary attacker or goal.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '30 pokes'
  },
  {
    id: 'l7',
    title: 'Overhand Accuracy',
    description: 'Hit a specific target on the goal or wall using a strict overhand release.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '30 hits'
  },
  {
    id: 'l8',
    title: 'Sidearm Shop',
    description: 'Practice sidearm releases for speed and accuracy (with low follow-through).',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '20 shots'
  },
  {
    id: 'l9',
    title: 'Off-Hand Wall Ball',
    description: 'Exclusively use your non-dominant hand for catching and throwing.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '100 reps'
  },
  {
    id: 'l10',
    title: 'Quick Sticking',
    description: 'Catch and release the ball without a cradle against the wall.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '50 reps'
  },
  {
    id: 'l11',
    title: 'Behind the Back (BTB)',
    description: 'Practice the trick shot/pass behind your back for high-level stick control.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '15 reps'
  },
  {
    id: 'l12',
    title: '20-Yard Shuttles',
    description: 'Sprint 20 yards with a cradle, turn, and sprint back. Keep it fast.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '10 rounds'
  },
  {
    id: 'l13',
    title: 'Bounce Shots',
    description: 'Aim for the ball to skip 3 feet in front of the goal line.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '20 shots'
  },
  {
    id: 'l14',
    title: 'High-to-Low Finish',
    description: 'Start your stick high and finish low through the crease area.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '20 shots'
  },
  {
    id: 'l15',
    title: 'Face-off Grinds',
    description: 'Practice getting low and clamping down on the whistle.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '20 whistles'
  },
  {
    id: 'l16',
    title: 'Clearing Pass Long',
    description: 'Aim for a target 40 yards down field with a powerful long-range pass.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '15 reps'
  },
  {
    id: 'l17',
    title: 'V-Cuts',
    description: 'Plant hard and change direction in a V-shape before catching a ball.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '20 cuts'
  },
  {
    id: 'l18',
    title: 'Stick Fakes',
    description: 'Practice the head and shoulder fake to freeze the goalie.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '30 fakes'
  },
  {
    id: 'l19',
    title: 'Crank Shots (Power)',
    description: 'Focus on full body rotation and footwork for maximum shot speed.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '15 shots'
  },
  {
    id: 'l20',
    title: 'Traffic Cradling',
    description: 'Cradle through multiple obstacles while maintaining a high stick position.',
    sports: ['lacrosse'],
    type: 'sport-specific',
    reps: '5 rounds'
  },

  // COMMON DRILLS
  {
    id: 'c1',
    title: 'Wind Sprints',
    description: 'Sprint 20 yards, jog back, and repeat.',
    sports: ['soccer', 'lacrosse', 'both'],
    type: 'conditioning',
    reps: '10 sprints'
  },
  {
    id: 'st1',
    title: 'Push-ups',
    description: 'Standard push-ups with good form.',
    sports: ['soccer', 'lacrosse', 'both', 'none'],
    type: 'strength',
    reps: '25 reps'
  }
];
