import SwiftUI

struct HomeView: View {
    @ObservedObject var viewModel: HomeViewModel
    @State private var newName = ""

    var body: some View {
        ZStack {
            Color(Constants.black)
                .ignoresSafeArea()
            VStack (alignment: .center) {
                ScrollView {
                    HStack {
                        Spacer()
                        Button(action: {
                            viewModel.showingSheet = true
                        }) {
                            Image(systemName: "plus.circle.fill")
                                .resizable()
                                .frame(width: 40, height: 40)
                                .foregroundColor(Constants.red)
                        }
                        .buttonStyle(PlainButtonStyle())
                        .onHover { hovering in
                            if hovering {
                                NSCursor.pointingHand.push()
                            } else {
                                NSCursor.pop()
                            }
                        }
                    }
                    Image("logo")
                        .resizable()
                        .aspectRatio(1, contentMode: .fit)
                        .frame(minHeight: 200, maxHeight: 400)
                    Text("NITFLEX")
                        .font(.system(size: 120, weight: .bold))
                        .foregroundColor(Constants.red)
                        .padding(5)
                    HStack {
                        ForEach(viewModel.users, id: \.self) { user in
                            NavigationLink(
                                destination: WrapperView()
                            ) {
                                VStack {
                                    Image(systemName: "person.fill")
                                        .resizable()
                                        .frame(width: 80, height: 80)
                                        .foregroundColor(Color.blue)
                                        .padding()
                                    Text(user.name)
                                        .foregroundColor(.white)
                                        .font(.system(size: 30))
                                }
                                .padding(10)
                            }
                            .background(Constants.darkGray)
                            .buttonStyle(PlainButtonStyle())
                            .cornerRadius(15)
                            .onHover { hovering in
                                if hovering {
                                    NSCursor.pointingHand.push()
                                } else {
                                    NSCursor.pop()
                                }
                            }
                        }
                    }
                }
            }
            .padding()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(red: 20/255.0, green: 20/255.0, blue: 20/255.0))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .sheet(isPresented: $viewModel.showingSheet) {
            CreateUserView(viewModel: viewModel)
        }
    }
}

#Preview {
    HomeView(viewModel: HomeViewModel())
}
