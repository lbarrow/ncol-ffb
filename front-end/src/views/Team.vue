<template lang="pug">
  .team-page(v-if="owner.displayname")
    .team-page__inner
      h2.page-title
        .page-title__sub Team
        .page-title__main {{ owner.displayname}}
        .page-title__photo(:class="'owner-photo--' + owner.ownerid")
    .team-stats
      .team-stats__record {{ owner.wins }}-{{ owner.losses }}
      .team-stats__amount
        span(v-html="formatScore(owner.pointsfor)")
        strong Points For
      .team-stats__amount
        span(v-html="formatScore(owner.pointsagainst)")
        strong Points Against
      .team-stats__streak(v-html="streak")
      .team-stats__history
        span.team-stats__result(v-for="result in turnHistoryToArray(owner.result_history)" :class="'team-stats__result--' + result") {{ result }}
    .team
      .team__players
        ul.team__positions
          li.team__position(v-for="position in positions" :key="position._id")
            h3.team__position-title {{ position._id }}s
            ul.team__position-players
              li(v-for="player in position.players")
                team-player(:player="player")
      .team__upcoming
        h3 Upcoming
        ul.matchup-upcoming
          li.matchup-upcoming__item(v-for="team in upcoming")
            router-link.matchup-upcoming__link(:to="'/team/' + team.ownerid")
              .matchup-upcoming__photo(:class="'owner-photo--' + team.ownerid")
              .matchup-upcoming__week Week {{ team.week }}
              .matchup-upcoming__name {{ team.displayname }}
              .matchup-upcoming__record {{team.wins}}-{{team.losses}}
</template>

<script>
import axios from 'axios'
import scoreFormatter from '@/utility/scoreFormatter'
import TeamPlayer from '@/components/TeamPlayer.vue'

export default {
  name: 'Team',
  components: {
    TeamPlayer
  },
  data() {
    return {
      owner: {},
      positions: [],
      upcoming: []
    }
  },
  mounted() {
    this.loadData()
  },
  watch: {
    $route() {
      this.loadData()
    }
  },
  computed: {
    streak() {
      const streakAmount = this.owner.streak.substr(1)
      if (this.owner.streak.charAt(0) === 'W') {
        return 'Won ' + streakAmount
      }
      return 'Lost ' + streakAmount
    }
  },
  methods: {
    turnHistoryToArray(historyString) {
      return historyString.split(',')
    },
    formatScore(score) {
      return scoreFormatter(score)
    },
    async loadData() {
      const API_URL = `/api/team/${this.$route.params.id}`
      const { data } = await axios.get(API_URL)
      this.owner = data.owner
      this.positions = data.positions
      this.upcoming = data.upcoming
    }
  }
}
</script>

<style lang="scss">
.team {
  background-color: rgba(black, 0.25);
  border-top: 1px solid rgba(white, 0.1);
  margin: 0 -4rem;
  padding: 4rem;
  @media (min-width: 48em) {
    display: grid;
    grid-template-columns: 1fr 20rem;
    grid-gap: 5rem;
    margin: 0;
  }
  h3 {
    color: $green;
    font-weight: normal;
    margin: 0 0 1.25rem;
  }
}
.team__upcoming {
}
.team__players {
  padding-bottom: 6rem;
  @media (min-width: 48em) {
    padding-bottom: 0;
  }
}
.team__positions {
}
.team__position {
  padding-bottom: 4rem;
  &:last-of-type {
    padding-bottom: 0;
  }
}
.team__position-title {
}
.team__position-players {
}

.team-stats {
  font-size: 1.8rem;
  border-top: 1px solid rgba(white, 0.25);
  padding: 2rem 0;
  @media (min-width: 48em) {
    display: flex;
    align-items: center;
  }
  h2 {
    text-transform: uppercase;
  }
}
.team-stats__record,
.team-stats__amount,
.team-stats__streak {
  padding-bottom: 0.4rem;
  @media (min-width: 48em) {
    padding-bottom: 0;
  }
}
.team-stats__record {
  padding-right: 2.5rem;
  &::before {
    margin-bottom: 0.1rem;
  }
}
.team-stats__amount {
  padding-right: 2.5rem;
  strong {
    font-weight: normal;
    font-size: 1.2rem;
    margin-left: 0.3125rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
}
.team-stats__streak {
  margin-left: auto;
  padding-right: 1.25rem;
  strong {
    font-weight: normal;
    font-size: 1.2rem;
    margin-left: 0.3125rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
}
.team-stats__history {
  display: flex;
  flex-wrap: wrap;
  max-width: 19.2rem;
}
.team-stats__result {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  margin: 0.2rem;
  border-radius: 100%;
  height: 2rem;
  width: 2rem;
}
.team-stats__result--W {
  color: white;
  background-color: rgba($blue, 0.5);
}
.team-stats__result--L {
  color: white;
  background-color: rgba($orange, 0.75);
}

.matchup-upcoming {
}
.matchup-upcoming__item {
  border-top: 1px solid rgba(white, 0.1);
  padding: 0.4rem 0 1.5rem;
}
.matchup-upcoming__week {
  letter-spacing: 0.15em;
  line-height: 1;
  font-size: 1.2rem;
  padding-bottom: 0.5rem;
  text-transform: uppercase;
}
.matchup-upcoming__link {
  display: block;
  text-decoration: none;
  color: white;
  font-weight: normal;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  position: relative;
  transition: all 0.2s ease;
  display: block;
  padding: 1rem 1rem 1rem 6rem;
  &:hover {
    background-color: rgba($blue, 0.15);
    border-color: rgba($blue, 0.15);
    box-shadow: 0 8px 12px rgba(black, 0.8);
    transform: translateY(-0.4rem);
  }
}
.matchup-upcoming__photo {
  width: 4rem;
  height: 4rem;
  position: absolute;
  left: 0.8rem;
  top: 1rem;
  border-radius: 100%;
  background-size: contain;
}
.matchup-upcoming__name {
  font-size: 1.6rem;
  line-height: 1.1;
  font-weight: bold;
  padding-bottom: 0.2rem;
}
.matchup-upcoming__record {
  line-height: 1;
  color: $blue;
  font-size: 1.4rem;
}
</style>
