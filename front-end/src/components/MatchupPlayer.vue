<template lang="pug">
  div
    .matchup-player.matchup-player--spacer(v-if="spacer")
    .matchup-player(v-else :class="playerClasses")
      .matchup-player__img
        img(:src="playerImageURL" alt="")
      .matchup-player__details
        h4.matchup-player__name
          template(v-if="player.position !== 'DST'")
            span.matchup-player__first-letter {{ firstNameLetter }}&nbsp;
            span.matchup-player__first-name {{ player.firstName}}&nbsp;
            span.matchup-player__last-name {{ player.lastName}}
            .matchup-player__team {{player.teamAbbr}}
          template(v-else)
            span {{player.teamFullName}}
        template(v-if="player.game.quarter")
          .matchup-player__game {{ gameDesc }}
        template(v-else)
          .matchup-player__game.matchup-player__game--bye BYE
      //- .matchup-player__statline(v-if="player.statline")
      //-   ul.matchup-player__stats.matchup-player__stats--dst(v-if="player.position === 'DST'")
      //-     li {{player.statline.sacks}} sacks
      //-     li {{player.statline.fumbles}} fumbles
      //-     li {{player.statline.ints}} ints
      //-     li {{player.statline.safeties}} safeties
      //-     li {{player.statline.TDs}} TDs
      //-     li {{player.statline.pointsAllowed}} pointsAllowed
      //-   ul.matchup-player__stats(v-else)
      //-     li.matchup-player__stat(v-if="player.statline.passingAttempts")
      //-       | {{player.statline.passingCompletions}}/{{player.statline.passingAttempts}} for {{player.statline.passingYards}} yards, {{player.statline.passingTDs}} TDs, {{player.statline.passingInts}} Ints
      //-       template(v-if="player.statline.passingTwoPts") {{player.statline.passingTwoPts}} Two Point Conversions
      //-     li.matchup-player__stat(v-if="player.statline.rushingAttempts")
      //-       | {{player.statline.rushingAttempts}} rushes for {{player.statline.rushingYards}} yards, {{player.statline.rushingTDs}} TDs
      //-       template(v-if="player.statline.rushingTwoPts") {{player.statline.rushingTwoPts}} Two Point Conversions
      //-     li.matchup-player__stat(v-if="player.statline.receivingReceptions")
      //-       | {{player.statline.receivingReceptions}} receptions for {{player.statline.receivingYards}} yards, {{player.statline.receivingTDs}} TDs
      //-       template(v-if="player.statline.receivingTwoPts") {{player.statline.receivingTwoPts}} Two Point Conversions
      //-     li.matchup-player__stat(v-if="player.statline.fumbles")
      //-       | {{player.statline.fumbles}} Fumbles
      .matchup-player__points(v-html="playerFantasyPoints")
</template>

<script>
import moment from 'moment'
import scoreFormatter from '@/utility/scoreFormatter'
export default {
  name: 'MatchupPlayer',
  props: {
    player: Object,
    spacer: {
      type: Boolean,
      default: false
    }
  },
  watch: {
    player(a, b) {
      if (a.fantasyPoints != b.fantasyPoints) {
        const changeMessage = `${
          this.player.displayName
        } points changed ${a.fantasyPoints - b.fantasyPoints}`
        this.$emit('player-change', changeMessage)
      }
    }
  },
  computed: {
    firstNameLetter() {
      return `${this.player.firstName.charAt(0)}.`
    },
    playerClasses() {
      let isPlaying = false
      if (this.player.game) {
        if (this.player.game.quarter) {
          if (
            this.player.game.quarter !== 'Final' &&
            this.player.game.quarter !== 'final overtime'
          ) {
            isPlaying = true
          }
        }
      }
      return {
        'matchup-player--DST': this.player.position === 'DST',
        'matchup-player--best': this.player.best && this.player.fantasyPoints,
        'matchup-player--playing': isPlaying
      }
    },
    playerImageURL() {
      if (this.player.position === 'DST') {
        return '/graphics/logos/' + this.player.teamAbbr + '.svg'
      }
      return `/graphics/players/${this.player.esbId}.png`
    },
    opponentAbbr() {
      if (this.player.teamAbbr === this.player.game.awayTeam.teamAbbr) {
        return this.player.game.homeTeam.teamAbbr
      }
      return this.player.game.awayTeam.teamAbbr
    },
    playerFantasyPoints() {
      if (this.player.fantasyPoints) {
        return scoreFormatter(this.player.fantasyPoints)
      }
      if (this.player.game) {
        if (this.player.game.quarter) {
          return scoreFormatter(0.0)
        }
      }
      return '--'
    },
    gameDesc() {
      const game = this.player.game
      const gameTime = moment(this.player.game.isoTime).format('ddd h:mm A')
      if (!game.quarter) {
        if (this.player.teamAbbr === game.awayTeam.teamAbbr) {
          return `at ${this.opponentAbbr}, ${gameTime}`
        }
        return `vs ${this.opponentAbbr}, ${gameTime}`
      } else if (
        game.quarter === 'Final' ||
        game.quarter === 'final overtime'
      ) {
        if (this.player.teamAbbr === game.awayTeam.teamAbbr) {
          const gameResult = this.gameResult(
            game.awayTeam.score.current,
            game.homeTeam.score.current
          )
          return `${gameResult} ${game.awayTeam.score.current}-${game.homeTeam.score.current} at ${this.opponentAbbr}`
        }
        const gameResult = this.gameResult(
          game.homeTeam.score.current,
          game.awayTeam.score.current
        )
        return `${gameResult} ${game.homeTeam.score.current}-${game.awayTeam.score.current} vs ${this.opponentAbbr}`
      }
      const score = `${game.homeTeam.teamAbbr} ${game.homeTeam.score.current} @ ${game.awayTeam.teamAbbr} ${game.awayTeam.score.current}`
      return `${score} • ${this.formatQuarter(game.quarter)} ${game.clock}`
    }
  },
  methods: {
    formatQuarter(quarter) {
      switch (quarter) {
        case '1':
          return '1st'
        case '2':
          return '2nd'
        case '3':
          return '3rd'
        case '4':
          return '4th'
      }
      return quarter
    },
    gameResult(playerScore, opposingScore) {
      if (playerScore > opposingScore) {
        return 'Won'
      }
      if (playerScore == opposingScore) {
        return 'Tied'
      }
      return 'Lost'
    }
  }
}
</script>

<style lang="scss">
.matchup-player {
  padding: 1rem 1rem 1rem 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  min-height: 10.6rem;
  display: grid;
  grid-template-columns: 4rem 1fr;
  background-color: darken($blue_dark, 7);
  align-items: center;
  position: relative;
  @media (min-width: 48em) {
    min-height: 5rem;
    padding: 0.5rem 1.5rem 0.5rem 1rem;
    grid-template-columns: 4rem 1fr auto;
  }
}
.matchup-player--best {
  background-color: lighten($blue_dark, 3);
  &::before {
    content: '';
    width: 0;
    height: 0;
    position: absolute;
    top: calc(50% - 0.75rem);
    left: -0.75rem;
    background: url(/graphics/icon_star.svg);
    background-size: contain;
    height: 1.5rem;
    width: 1.5rem;
  }
}
.matchup-player--playing {
  border-color: rgba($blue, 0.5);
  &::after {
    background-color: $blue;
    content: '';
    position: absolute;
    opacity: 1;
    right: 0;
    top: 0;
    bottom: 0;
    width: 7.2rem;
    border-radius: 0 0.5rem 0.5rem 0;
  }
  .matchup-player__points {
    color: $blue_dark;
    position: relative;
    z-index: 1;
  }
}
.matchup-player--spacer {
  background-color: transparent;
}
.matchup-player__img {
  background-color: darken($blue_dark, 5);
  border-radius: 100%;
  height: 4rem;
  overflow: hidden;
  position: relative;
  img {
    position: absolute;
    left: -0.5rem;
    top: 0.3rem;
    max-width: 5rem;
    .matchup-player--DST & {
      left: 0.5rem;
      top: 0.5rem;
      max-width: 3rem;
    }
  }
}
.matchup-player__details {
  grid-column: 1 / 3;
  padding-top: 1rem;
  @media (min-width: 48em) {
    grid-area: auto;
    padding-top: 0;
    padding-left: 1rem;
  }
}
.matchup-player__name {
  display: flex;
  align-items: baseline;
  font-size: 1.3rem;
  font-weight: 300;
  @media (min-width: 60em) {
    font-size: 1.5rem;
  }
}
.matchup-player__first-letter {
  @media (min-width: 60em) {
    display: none;
  }
  .matchup-player--DST & {
    display: none;
  }
}
.matchup-player__first-name {
  display: none;
  @media (min-width: 60em) {
    display: inline;
  }
  .matchup-player--DST & {
    display: inline;
  }
}
.matchup-player__team {
  font-size: 0.9rem;
  font-family: $font_ideal;
  opacity: 0.5;
  margin-left: 0.6rem;
  letter-spacing: 0.2rem;
  @media (min-width: 48em) {
    font-size: 1.1rem;
  }
}
.matchup-player__game {
  font-size: 1rem;
  opacity: 0.7;
  font-family: $font_ideal;
}
.matchup-player__game--bye {
}
.matchup-player__statline {
}
.matchup-player__best {
}
.matchup-player__stats {
}
.matchup-player__stats--dst {
}
.matchup-player__stats {
}
.matchup-player__stat {
}
.matchup-player__points {
  grid-column: 2;
  grid-row: 1;
  font-size: 2.4rem;
  color: $blue;
  margin-left: auto;
  @media (min-width: 48em) {
    grid-area: auto;
  }
}
.matchup-player__points--to-play {
}
</style>
