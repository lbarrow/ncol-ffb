<template lang="pug">
  .matchup-page
    .matchup-page__inner(v-if="matchup")
      h2.page-title
        .page-title__sub Week {{matchup.week}}
        .page-title__main Matchup
      //- .change-messages
      //-   div(v-for="message in changeMessages") {{ message }}
    .matchup
      .matchup-team(v-for="team in teams" :key="team.owner.ownerId")
        .matchup-team__header
          matchup-header(:owner="team.owner"
            :total="team.teamTotal"
            :playersLeft="playersLeft(team.owner.ownerId)"
            :playersPlaying="playersPlaying(team.owner.ownerId)")
        ul.matchup-positions
          li.matchup-position(v-for="position in team.positions" :key="position._id")
            h3.matchup-position__title {{position._id}}s
            ul.matchup-players
              li.matchup-players__item(v-for="index in position.playerRowsToRender")
                matchup-player(v-if="position.players[index - 1]" :player="position.players[index - 1]" v-on:player-change="showPlayerChangeMessage")
                matchup-player(v-else :spacer="true")
</template>

<script>
import MatchupHeader from '@/components/MatchupHeader.vue'
import MatchupPlayer from '@/components/MatchupPlayer.vue'
import axios from 'axios'

export default {
  name: 'Matchup',
  components: {
    MatchupHeader,
    MatchupPlayer
  },
  data() {
    return {
      matchup: {},
      teams: [],
      changeMessages: [],
      updateIntervalId: undefined
    }
  },
  async mounted() {
    this.checkForUpdatedData()
    this.updateIntervalId = setInterval(async () => {
      await this.checkForUpdatedData()
    }, 5000)
  },
  beforeDestroy() {
    clearInterval(this.updateIntervalId)
  },
  methods: {
    async checkForUpdatedData() {
      const API_URL = `http://localhost:4444/matchup/${this.$route.params.id}`
      const response = await axios.get(API_URL)
      this.matchup = response.data.matchup
      this.teams = response.data.teams
    },
    showPlayerChangeMessage(changeMessage) {
      this.changeMessages.unshift(changeMessage)
    },
    isTeamHomeOrAway(ownerId) {
      if (ownerId === this.matchup.away) {
        return 'away'
      }
      return 'home'
    },
    playersLeft(ownerId) {
      return this.matchup[this.isTeamHomeOrAway(ownerId) + 'PlayersLeft']
    },
    playersPlaying(ownerId) {
      return this.matchup[this.isTeamHomeOrAway(ownerId) + 'PlayersPlaying']
    }
  }
}
</script>

<style lang="scss">
.matchup {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 0 -4rem;
  @media (min-width: 42em) {
    grid-gap: 6rem;
    margin: 0;
  }
}
.matchup-team {
  border-top: 1px solid rgba(white, 0.1);
  @media (min-width: 48em) {
    border: 1px solid rgba(white, 0.1);
    border-radius: 0.5rem;
  }
}
.matchup-team__header {
}
.matchup-positions {
  background-color: rgba(black, 0.35);
  padding: 2rem 0.8rem;
  @media (min-width: 42em) {
    padding: 0 2rem;
  }
  .matchup-team:first-child & {
    padding-left: 1.2rem;
    @media (min-width: 42em) {
      padding-left: 2rem;
    }
  }
  .matchup-team:last-child & {
    padding-right: 1.2rem;
    @media (min-width: 42em) {
      padding-right: 2rem;
    }
  }
}
.matchup-position {
  padding: 4rem 0 2rem;
  position: relative;

  @media (min-width: 42em) {
    padding: 3rem 0;
  }
}
.matchup-position__title {
  font-family: $font_ideal;
  font-size: 1rem;
  letter-spacing: 0.3rem;
  position: absolute;
  left: calc(100% - 1rem);
  top: -1.6rem;
  padding-top: 2.8rem;
  opacity: 0.75;
  text-align: center;
  width: 4.2rem;
  @media (min-width: 42em) {
    font-size: 1.2rem;
    border-top: 0.2rem solid rgba($blue, 0.6);
    border-bottom: 0.2rem solid rgba($blue, 0.6);
    left: calc(100% + 3rem);
    top: 1.6rem;
    padding-top: 2.8rem;
    opacity: 0.75;
    text-align: center;
    width: 4.2rem;
    bottom: 1rem;
  }
  &::before,
  &::after {
    background: rgba($blue, 0.4);
    content: '';
    position: absolute;
    height: 0.2rem;
    left: calc(100% - 0.05rem);
    top: 3.2rem;
    width: 100%;
    @media (min-width: 42em) {
      height: 1.8rem;
      left: calc(50% - 0.05rem);
      top: 0;
      width: 0.1rem;
    }
  }
  &::after {
    left: calc(-100% - 0.3rem);
    @media (min-width: 42em) {
      top: 5.4rem;
      left: calc(50% - 0.05rem);
      height: auto;
      bottom: 0;
    }
  }
}
.matchup-team:last-child {
  .matchup-position__title {
    display: none;
  }
}
.matchup-players {
}
.matchup-players__item {
  margin-bottom: 0.8rem;
  @media (min-width: 48em) {
    margin-bottom: 0.8rem;
  }
  &:last-child {
    margin-bottom: 0;
  }
}
</style>
